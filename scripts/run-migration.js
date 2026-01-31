const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env vars
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Get database password from env (you may need to set this)
const DATABASE_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DATABASE_PASSWORD) {
  console.log('SUPABASE_DB_PASSWORD not found in .env.local');
  console.log('Please add it to your .env.local file.');
  console.log('You can find it in Supabase Dashboard > Settings > Database > Connection string');
  process.exit(1);
}

// Construct the connection string
const connectionString = `postgresql://postgres.pbfaoshmaogrsgatfojs:${DATABASE_PASSWORD}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`;

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/020_inter_company_transactions.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Running migration 020_inter_company_transactions.sql...\n');

    // Execute the entire migration
    await client.query(migrationSql);

    console.log('✅ Migration completed successfully!');

    // Verify the table was created
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inter_company_transactions'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Created table with columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check daily_pnl columns
    const pnlResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'daily_pnl'
      AND column_name IN ('ic_revenue', 'ic_expense')
    `);

    console.log('\n📊 Added columns to daily_pnl:');
    pnlResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n💡 The table may already exist. This is OK if you ran the migration before.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
