import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let value = trimmed.substring(eqIdx + 1).trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }
  }

  return vars;
}

const env = loadEnv();

// Get database connection - prefer direct connection string or construct from Supabase URL
let connectionString = env.DATABASE_URL || env.SUPABASE_DB_URL;

if (!connectionString) {
  // Construct from Supabase URL
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePassword = env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  // Extract project ref from URL: https://xxxxx.supabase.co
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error('Could not parse Supabase URL');
    process.exit(1);
  }

  const projectRef = match[1];

  if (supabasePassword) {
    // Use direct connection
    connectionString = `postgresql://postgres.${projectRef}:${supabasePassword}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`;
  } else {
    console.log('\n========================================');
    console.log('DATABASE CONNECTION NOT CONFIGURED');
    console.log('========================================');
    console.log('\nTo run migrations programmatically, add one of these to .env.local:');
    console.log('  DATABASE_URL=<your-supabase-connection-string>');
    console.log('  or');
    console.log('  SUPABASE_DB_PASSWORD=<your-database-password>');
    console.log('\nAlternatively, run the migration manually:');
    console.log(`  1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log('  2. Paste the contents of: supabase/migrations/016_product_skus.sql');
    console.log('  3. Click "Run"');
    console.log('========================================\n');
    process.exit(1);
  }
}

console.log('Connecting to database...');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Read migration file
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '016_product_skus.sql');
const sqlContent = readFileSync(sqlPath, 'utf-8');

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected! Running migration...\n');

    // Execute the entire migration as one transaction
    await client.query('BEGIN');

    try {
      await client.query(sqlContent);
      await client.query('COMMIT');
      console.log('========================================');
      console.log('Migration completed successfully!');
      console.log('========================================');
      console.log('\nThe product_skus table has been created with:');
      console.log('  - Status tracking (active/historic/discontinued)');
      console.log('  - Platform availability (shopify/etsy)');
      console.log('  - Foreign keys added to sku_mapping and bom tables');
      console.log('  - RLS policies configured');
      console.log('  - get_canonical_sku() helper function');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Migration error:', err.message);

    if (err.message.includes('already exists')) {
      console.log('\nNote: Some objects already exist. This is OK if the migration was partially run before.');
    }
  } finally {
    await client.end();
  }
}

runMigration();
