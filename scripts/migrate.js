import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not defined.');
    console.error('Please configure DATABASE_URL in your .env file.');
    process.exit(1);
  }

  console.log('🔄 Connecting to PostgreSQL database...');
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully.');

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`⏳ Executing migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`✅ Completed migration: ${file}`);
    }

    // Ensure bootstrap admin email is seeded if provided in env
    const bootstrapEmail = process.env.INITIAL_ADMIN_EMAIL;
    if (bootstrapEmail) {
      await client.query(
        `INSERT INTO admin_users (email, is_active) VALUES ($1, TRUE) ON CONFLICT (email) DO NOTHING`,
        [bootstrapEmail.trim().toLowerCase()]
      );
      console.log(`✅ Bootstrapped admin user: ${bootstrapEmail}`);
    }

    console.log('🎉 All migrations executed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
