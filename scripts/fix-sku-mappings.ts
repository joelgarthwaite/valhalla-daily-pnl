/**
 * Fix SKU mappings - delete wrong mappings and re-import from CSV
 *
 * Run with: npx tsx scripts/fix-sku-mappings.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        if (key && !key.startsWith('#')) {
          process.env[key] = line.substring(idx + 1).replace(/^["']|["']$/g, '');
        }
      }
    });
  }
}

loadEnv();

const CSV_PATH = '/Users/JoelGarthwaite/Desktop/Valhalla Daily P&L (Claude)/SKU_Audit_Results.csv';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CsvRow {
  brand: string;
  legacy_sku: string;
  proposed_new_sku: string;
  status: string;
  platforms: string;
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

async function fix() {
  console.log('=== Fix SKU Mappings ===\n');

  // Get brand IDs
  const { data: brands } = await supabase
    .from('brands')
    .select('id, code');

  const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);
  console.log(`Brands: DC=${brandMap.get('DC')}, BI=${brandMap.get('BI')}`);

  // Step 1: Count existing mappings
  const { count: existingCount } = await supabase
    .from('sku_mapping')
    .select('*', { count: 'exact', head: true });

  console.log(`\nStep 1: Current mappings in DB: ${existingCount}`);

  // Step 2: Delete all existing mappings
  console.log('\nStep 2: Deleting all existing mappings...');
  const { error: deleteError } = await supabase
    .from('sku_mapping')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq impossible value)

  if (deleteError) {
    console.error('Delete error:', deleteError.message);
    return;
  }
  console.log('   ✅ Deleted all existing mappings');

  // Step 3: Read CSV and filter AUTO_MAPPED entries
  console.log('\nStep 3: Reading CSV...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);

  const autoMapped = rows.filter(row =>
    row.status === 'AUTO_MAPPED' &&
    row.legacy_sku &&
    row.proposed_new_sku &&
    row.legacy_sku !== row.proposed_new_sku
  );

  console.log(`   Found ${autoMapped.length} AUTO_MAPPED entries`);

  // Step 4: Prepare insert data
  console.log('\nStep 4: Preparing inserts...');
  const toInsert = autoMapped.map(m => ({
    old_sku: m.legacy_sku.toUpperCase().trim(),
    current_sku: m.proposed_new_sku.toUpperCase().trim(),
    brand_id: brandMap.get(m.brand) || null,
    platform: null,
    notes: `SKU audit import - ${m.brand}`,
  }));

  // Show preview
  console.log('\n   Preview (first 10):');
  toInsert.slice(0, 10).forEach(m => {
    console.log(`     ${m.old_sku} → ${m.current_sku}`);
  });

  // Step 5: Insert in batches
  console.log(`\nStep 5: Inserting ${toInsert.length} mappings...`);
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('sku_mapping')
      .insert(batch);

    if (error) {
      console.error(`   Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} inserted`);
    }
  }

  // Step 6: Verify
  console.log('\nStep 6: Verifying...');
  const { data: sample } = await supabase
    .from('sku_mapping')
    .select('old_sku, current_sku')
    .limit(5);

  console.log('   Sample mappings now in DB:');
  sample?.forEach(m => {
    console.log(`     ${m.old_sku} → ${m.current_sku}`);
  });

  const { count: finalCount } = await supabase
    .from('sku_mapping')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== Summary ===');
  console.log(`Deleted: ${existingCount} old mappings`);
  console.log(`Inserted: ${inserted} new mappings`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in DB: ${finalCount}`);

  // Verify B-series format
  const bSeriesCount = toInsert.filter(m => m.current_sku.startsWith('B')).length;
  console.log(`\nB-series targets: ${bSeriesCount} of ${inserted} (${((bSeriesCount/inserted)*100).toFixed(1)}%)`);
}

fix().catch(console.error);
