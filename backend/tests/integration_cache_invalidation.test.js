import assert from 'node:assert/strict';

// Regression test for the PR review P1: every integration mutation calls
// invalidateProviderCache(), which is exported from notifications.js. Without
// the import each mutation threw ReferenceError after persisting (client got
// 400, and the provider cache was never invalidated).
//
// Uses the same disposable-database contract as booking_status.test.js:
// NODE_ENV=test, DATABASE_URL rewritten to stb_test (created by
// platform_hardening.test.js earlier in the npm test chain).
if (process.env.NODE_ENV !== 'test') {
  throw new Error('integration_cache_invalidation.test.js requires NODE_ENV=test');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must point to a disposable PostgreSQL instance');
}
const testUrl = new URL(process.env.DATABASE_URL);
testUrl.pathname = '/stb_test';
process.env.DATABASE_URL = testUrl.toString();
process.env.STB_SECRET_KEY ||= 'test-only-secret-key-32-bytes-minimum!!';

const { query, getPool } = await import('../../lib/db.js');
const { listIntegrations, upsertIntegration, setDefaultIntegration, deleteIntegration } =
  await import('../../lib/integrations.js');
const { refreshProviders, getProvider } = await import('../../lib/notifications.js');

const PROVIDER_TYPE = 'QA_CACHE_TEST';
const PROVIDER_KEY = 'qa-invalidator';
let passed = 0;

function test(name, condition) {
  assert.ok(condition, name);
  passed++;
  console.log(`✅ ${name}`);
}

try {
  // Baseline: cache reuses the provider instance while fresh.
  await refreshProviders();
  const emailBefore = getProvider('email');
  await refreshProviders();
  test('provider cache reuses instances inside the TTL', getProvider('email') === emailBefore);

  // INSERT mutation path — must persist and must not throw ReferenceError.
  const created = await upsertIntegration({
    providerType: PROVIDER_TYPE,
    providerKey: PROVIDER_KEY,
    displayName: 'QA-CACHE-TEST',
    enabled: true,
    mode: 'test',
    config: { host: 'example.invalid' },
    secrets: null,
    isDefault: false,
    actorEmail: 'qa-test@example.com'
  });
  test('insert mutation persists without ReferenceError', Boolean(created && created.id));

  // UPDATE mutation path.
  const updated = await upsertIntegration({
    id: created.id,
    providerType: PROVIDER_TYPE,
    providerKey: PROVIDER_KEY,
    displayName: 'QA-CACHE-TEST-UPDATED',
    enabled: true,
    mode: 'test',
    config: { host: 'example.invalid' },
    secrets: null,
    isDefault: false,
    actorEmail: 'qa-test@example.com'
  });
  test('update mutation persists without ReferenceError',
    Boolean(updated && updated.display_name === 'QA-CACHE-TEST-UPDATED'));

  // set-default mutation path.
  test('set-default mutation succeeds', (await setDefaultIntegration(PROVIDER_TYPE, created.id)) === true);

  // A mutation must invalidate the provider cache: the next refresh reruns the
  // loader, which rebuilds provider instances (observable by identity change).
  await refreshProviders();
  test('mutation invalidated the provider cache (fresh instance loaded)',
    getProvider('email') !== emailBefore);

  // DELETE mutation path.
  await deleteIntegration(created.id);
  const remaining = await listIntegrations({ type: PROVIDER_TYPE });
  test('delete mutation removes the row without ReferenceError', remaining.length === 0);
} finally {
  // Guarantee cleanup even when an assertion fails.
  await query('DELETE FROM integration_settings WHERE provider_type = $1', [PROVIDER_TYPE]);
  await getPool().end();
}

console.log(`Integration cache invalidation tests: ${passed} assertions passed`);
