import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration 020_inter_company_transactions.sql...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/020_inter_company_transactions.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  // Split into individual statements (simple split on semicolons outside of functions)
  // We'll execute the key statements one by one
  const statements = [
    // Create table
    `CREATE TABLE IF NOT EXISTS inter_company_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_brand_id UUID NOT NULL REFERENCES brands(id),
      to_brand_id UUID NOT NULL REFERENCES brands(id),
      transaction_date DATE NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      subtotal DECIMAL(12, 2) NOT NULL,
      tax DECIMAL(12, 2) DEFAULT 0,
      total DECIMAL(12, 2) NOT NULL,
      xero_invoice_id TEXT,
      xero_invoice_number TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'voided')),
      approved_at TIMESTAMPTZ,
      approved_by UUID,
      pricing_notes TEXT,
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT different_brands CHECK (from_brand_id != to_brand_id)
    )`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_ic_transactions_from_brand ON inter_company_transactions(from_brand_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ic_transactions_to_brand ON inter_company_transactions(to_brand_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ic_transactions_date ON inter_company_transactions(transaction_date)`,
    `CREATE INDEX IF NOT EXISTS idx_ic_transactions_status ON inter_company_transactions(status)`,

    // Add columns to daily_pnl
    `ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS ic_revenue DECIMAL(14, 2) DEFAULT 0`,
    `ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS ic_expense DECIMAL(14, 2) DEFAULT 0`,

    // Enable RLS
    `ALTER TABLE inter_company_transactions ENABLE ROW LEVEL SECURITY`,

    // Drop existing policies if they exist (to make idempotent)
    `DROP POLICY IF EXISTS "inter_company_transactions_select_policy" ON inter_company_transactions`,
    `DROP POLICY IF EXISTS "inter_company_transactions_insert_policy" ON inter_company_transactions`,
    `DROP POLICY IF EXISTS "inter_company_transactions_update_policy" ON inter_company_transactions`,
    `DROP POLICY IF EXISTS "inter_company_transactions_delete_policy" ON inter_company_transactions`,

    // Create RLS policies
    `CREATE POLICY "inter_company_transactions_select_policy"
      ON inter_company_transactions
      FOR SELECT
      TO authenticated
      USING (true)`,

    `CREATE POLICY "inter_company_transactions_insert_policy"
      ON inter_company_transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      )`,

    `CREATE POLICY "inter_company_transactions_update_policy"
      ON inter_company_transactions
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      )`,

    `CREATE POLICY "inter_company_transactions_delete_policy"
      ON inter_company_transactions
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      )`,
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const sql of statements) {
    const shortSql = sql.substring(0, 60).replace(/\n/g, ' ') + '...';
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        // Try direct query if rpc doesn't exist
        const { error: directError } = await supabase.from('_manual_query').select().limit(0);
        throw error;
      }

      console.log(`✓ ${shortSql}`);
      successCount++;
    } catch (error: any) {
      // For most operations, we can use a workaround
      console.log(`⚠ ${shortSql}`);
      console.log(`  Note: ${error.message || 'Could not execute directly'}`);
      errorCount++;
    }
  }

  console.log(`\nMigration complete: ${successCount} succeeded, ${errorCount} need manual review`);
  console.log('\nIf any statements failed, please run the full migration SQL in Supabase SQL Editor.');
}

runMigration().catch(console.error);
