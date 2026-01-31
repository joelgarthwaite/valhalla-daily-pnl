/**
 * Direct import of SKU mappings to Supabase
 * Bypasses the API and connects directly to the database
 *
 * Run with: npx tsx scripts/import-sku-mappings-direct.ts
 * Dry run:  npx tsx scripts/import-sku-mappings-direct.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const CSV_PATH = '/Users/JoelGarthwaite/Desktop/Valhalla Daily P&L (Claude)/SKU_Audit_Results.csv';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CsvRow {
  brand: string;
  legacy_sku: string;
  proposed_new_sku: string;
  status: string;
  platforms: string;
  order_count: string;
  first_order: string;
  last_order: string;
  notes: string;
}

function parseCSV(content: string): CsvRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header.trim()] = values[i] || '';
    });

    return row as unknown as CsvRow;
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== SKU Mapping Import (Direct) ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Read CSV
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`Found ${rows.length} total rows`);

  // Get brand IDs
  console.log('Fetching brand IDs...');
  const { data: brands, error: brandsError } = await supabase
    .from('brands')
    .select('id, code');

  if (brandsError) {
    console.error('Failed to fetch brands:', brandsError);
    process.exit(1);
  }

  const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);
  console.log(`Brands: DC=${brandMap.get('DC')}, BI=${brandMap.get('BI')}`);

  // Check existing mappings
  console.log('Checking for existing mappings...');
  const { data: existingMappings } = await supabase
    .from('sku_mapping')
    .select('old_sku');

  const existingSkus = new Set(existingMappings?.map(m => m.old_sku.toUpperCase()) || []);
  console.log(`Found ${existingSkus.size} existing mappings`);

  // Filter AUTO_MAPPED entries
  const autoMapped = rows.filter(row =>
    row.status === 'AUTO_MAPPED' &&
    row.proposed_new_sku &&
    row.legacy_sku
  );

  console.log(`\n${autoMapped.length} AUTO_MAPPED entries in CSV`);

  // Prepare insert data
  const toInsert = autoMapped
    .filter(m => !existingSkus.has(m.legacy_sku.toUpperCase().trim()))
    .map(m => ({
      old_sku: m.legacy_sku.toUpperCase().trim(),
      current_sku: m.proposed_new_sku.toUpperCase().trim(),
      brand_id: brandMap.get(m.brand) || null,
      platform: null,
      notes: `SKU audit import - ${m.brand}`,
    }));

  const alreadyExists = autoMapped.length - toInsert.length;

  console.log(`\nTo insert: ${toInsert.length}`);
  console.log(`Already exists: ${alreadyExists}`);

  // Show preview
  console.log('\nPreview (first 10):');
  toInsert.slice(0, 10).forEach(m => {
    console.log(`  ${m.old_sku} → ${m.current_sku} (${m.brand_id ? 'DC' : 'BI'})`);
  });

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made. Remove --dry-run flag to import.');
    return;
  }

  // Insert in batches
  console.log('\nInserting mappings...');
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('sku_mapping')
      .insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} mappings inserted`);
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (already exist): ${alreadyExists}`);
  console.log(`Errors: ${errors}`);

  // Verify
  const { count } = await supabase
    .from('sku_mapping')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal mappings in database: ${count}`);
}

main().catch(console.error);
