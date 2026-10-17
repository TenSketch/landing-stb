// Regression: migrations must be safe to RE-RUN.
//
// scripts/migrate.js has no ledger — it re-executes every migrations/*.sql file on every run
// (and `npm run db:migrate` is part of first-time setup and the documented upgrade path). The
// 002 seed inserts the two default surcharges with a bare `ON CONFLICT DO NOTHING`, which can
// only fire when a unique constraint covers the conflicting columns; `surcharges` only ever had
// a PRIMARY KEY on `id`, so nothing ever conflicted and every run appended 2 duplicate rows.
//
// This suite proves idempotency end to end: it builds a scratch database, runs the real
// migrate.js CLI twice, and asserts the second run changes no row counts at all.
//
// Contract (same as the other DB suites): NODE_ENV=test, and DATABASE_URL must already be in the
// process environment. The scratch DB is derived by swapping the URL pathname, so the application
// database (stb_dev) is never touched.
import assert from 'assert';
import dotenv from 'dotenv';
import pg from 'pg';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: ['.env.local', '.env'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');

const SCRATCH_DB_NAME = 'stb_migration_idempotency_test';

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
  }
}

function urlFor(dbName) {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/' + dbName;
  return url.toString();
}

async function connect(url) {
  const client = new pg.Client({
    connectionString: url,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  return client;
}

// Run the real CLI exactly as `npm run db:migrate` does.
function runMigrateCli() {
  return execFileSync(process.execPath, ['scripts/migrate.js'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: urlFor(SCRATCH_DB_NAME),
      INITIAL_ADMIN_EMAIL: 'admin@example.com',
      SUPER_ADMIN_OTP_REQUIRED: 'false',
    },
  });
}

async function tableCounts(client) {
  const { rows: tables } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  const counts = {};
  for (const { tablename } of tables) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${tablename}"`);
    counts[tablename] = rows[0].n;
  }
  return counts;
}

async function surchargesUniqueIndexOnName(client) {
  const sql =
    "SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname = 'public'" +
    " AND tablename = 'surcharges'" +
    " AND indexdef ILIKE '%unique%' AND indexdef ILIKE '%(name)%'";
  const { rows } = await client.query(sql);
  return rows[0].n > 0;
}

async function runTests() {
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Refusing to run: NODE_ENV must be "test".');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('❌ Refusing to run: DATABASE_URL is not set in the process environment.');
    process.exit(1);
  }

  console.log('🧪 Building a scratch database and running migrate.js twice...\n');

  const admin = await connect(urlFor('postgres'));
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB_NAME} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${SCRATCH_DB_NAME}`);
  await admin.end();

  let countsAfterFirstRun = {};
  let countsAfterSecondRun = {};
  let firstRunOk = true;
  let secondRunOk = true;
  let hasSurchargeNameUniqueIndex = false;

  try {
    try {
      runMigrateCli();
    } catch (err) {
      firstRunOk = false;
      console.log('   first migrate.js run failed:', (err.stderr || err.message || '').trim().split('\n').slice(-3).join(' | '));
    }
    const c1 = await connect(urlFor(SCRATCH_DB_NAME));
    countsAfterFirstRun = await tableCounts(c1);
    hasSurchargeNameUniqueIndex = await surchargesUniqueIndexOnName(c1);
    await c1.end();

    try {
      runMigrateCli();
    } catch (err) {
      secondRunOk = false;
      console.log('   second migrate.js run failed:', (err.stderr || err.message || '').trim().split('\n').slice(-3).join(' | '));
    }
    const c2 = await connect(urlFor(SCRATCH_DB_NAME));
    countsAfterSecondRun = await tableCounts(c2);
    await c2.end();
  } finally {
    const cleanup = await connect(urlFor('postgres'));
    await cleanup.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB_NAME} WITH (FORCE)`);
    await cleanup.end();
  }

  await test('migrate.js completes on a fresh database', () => {
    assert.ok(firstRunOk, 'first migrate.js run must exit 0');
  });

  await test('the 002 seed inserts exactly 2 surcharges on a fresh database', () => {
    assert.strictEqual(countsAfterFirstRun.surcharges, 2);
  });

  await test('re-running migrate.js does not duplicate the 002 surcharge seed', () => {
    assert.strictEqual(
      countsAfterSecondRun.surcharges,
      countsAfterFirstRun.surcharges,
      `surcharges went ${countsAfterFirstRun.surcharges} -> ${countsAfterSecondRun.surcharges} (seed is not idempotent)`
    );
  });

  await test('re-running migrate.js changes no table row counts (whole-schema idempotency)', () => {
    const drifted = Object.keys(countsAfterFirstRun)
      .filter((t) => countsAfterSecondRun[t] !== countsAfterFirstRun[t])
      .map((t) => `${t}: ${countsAfterFirstRun[t]} -> ${countsAfterSecondRun[t]}`);
    assert.deepStrictEqual(drifted, [], `re-running migrations changed row counts: ${drifted.join(', ')}`);
  });

  await test('surcharges.name carries a unique index so ON CONFLICT can arbitrate', () => {
    assert.ok(
      hasSurchargeNameUniqueIndex,
      'no UNIQUE index covers surcharges(name), so the 002 seed can never arbitrate and ' +
        'duplicates on every run'
    );
  });

  console.log(`\n🎉 Summary: ${passed}/${total} migration idempotency tests passed`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
