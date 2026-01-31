/**
 * Audit all SKUs - verify CSV matches database
 * Run with: npx tsx scripts/audit-skus.ts
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

async function audit() {
  console.log('=== FULL SKU AUDIT ===\n');

  // Parse CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log('CSV Summary:');
  console.log(`  Total rows: ${rows.length}`);

  // Group by status
  const byStatus: Record<string, CsvRow[]> = {};
  for (const row of rows) {
    if (!byStatus[row.status]) byStatus[row.status] = [];
    byStatus[row.status].push(row);
  }

  for (const [status, items] of Object.entries(byStatus)) {
    const dcCount = items.filter(i => i.brand === 'DC').length;
    const biCount = items.filter(i => i.brand === 'BI').length;
    console.log(`  ${status}: ${items.length} (DC: ${dcCount}, BI: ${biCount})`);
  }

  // Get brands
  const { data: brands } = await supabase.from('brands').select('id, code');
  const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);
  const brandIdMap = new Map(brands?.map(b => [b.id, b.code]) || []);

  // Get SKU mappings from DB
  const { data: dbMappings } = await supabase
    .from('sku_mapping')
    .select('old_sku, current_sku, brand_id');

  // Get product_skus from DB
  const { data: dbProductSkus } = await supabase
    .from('product_skus')
    .select('sku, brand_id');

  console.log('\n=== DATABASE STATUS ===');
  console.log(`SKU Mappings: ${dbMappings?.length || 0}`);
  console.log(`Product SKUs: ${dbProductSkus?.length || 0}`);

  // === CHECK 1: All AUTO_MAPPED entries should be in sku_mapping ===
  console.log('\n=== CHECK 1: AUTO_MAPPED → sku_mapping ===');

  const autoMapped = byStatus['AUTO_MAPPED'] || [];
  const dbMappingSet = new Set(dbMappings?.map(m => `${m.old_sku.toUpperCase()}|${m.current_sku.toUpperCase()}`) || []);

  let mappingMissing = 0;
  let mappingWrong = 0;

  for (const row of autoMapped) {
    const expectedKey = `${row.legacy_sku.toUpperCase()}|${row.proposed_new_sku.toUpperCase()}`;
    const dbMatch = dbMappings?.find(m => m.old_sku.toUpperCase() === row.legacy_sku.toUpperCase());

    if (!dbMatch) {
      console.log(`  MISSING: ${row.legacy_sku} → ${row.proposed_new_sku} (${row.brand})`);
      mappingMissing++;
    } else if (dbMatch.current_sku.toUpperCase() !== row.proposed_new_sku.toUpperCase()) {
      console.log(`  WRONG: ${row.legacy_sku} → DB has "${dbMatch.current_sku}" but CSV says "${row.proposed_new_sku}"`);
      mappingWrong++;
    }
  }

  if (mappingMissing === 0 && mappingWrong === 0) {
    console.log(`  ✅ All ${autoMapped.length} AUTO_MAPPED entries correctly in sku_mapping`);
  } else {
    console.log(`  ❌ Missing: ${mappingMissing}, Wrong: ${mappingWrong}`);
  }

  // === CHECK 2: All ALREADY_NEW_FORMAT should be in product_skus ===
  console.log('\n=== CHECK 2: ALREADY_NEW_FORMAT → product_skus ===');

  const alreadyNew = byStatus['ALREADY_NEW_FORMAT'] || [];
  const dbProductSkuSet = new Set(dbProductSkus?.map(p => p.sku.toUpperCase()) || []);

  let productMissing = 0;
  const missingProducts: string[] = [];

  for (const row of alreadyNew) {
    const sku = row.legacy_sku.toUpperCase();
    if (!dbProductSkuSet.has(sku)) {
      console.log(`  MISSING: ${row.legacy_sku} (${row.brand})`);
      missingProducts.push(row.legacy_sku);
      productMissing++;
    }
  }

  if (productMissing === 0) {
    console.log(`  ✅ All ${alreadyNew.length} ALREADY_NEW_FORMAT SKUs in product_skus`);
  } else {
    console.log(`  ❌ Missing: ${productMissing}`);
  }

  // === CHECK 3: All mapping TARGETS should be in product_skus ===
  console.log('\n=== CHECK 3: Mapping targets → product_skus ===');

  const mappingTargets = [...new Set(dbMappings?.map(m => m.current_sku.toUpperCase()) || [])];
  let targetMissing = 0;

  for (const target of mappingTargets) {
    if (!dbProductSkuSet.has(target)) {
      console.log(`  MISSING TARGET: ${target}`);
      targetMissing++;
    }
  }

  if (targetMissing === 0) {
    console.log(`  ✅ All ${mappingTargets.length} unique mapping targets in product_skus`);
  } else {
    console.log(`  ❌ Missing: ${targetMissing}`);
  }

  // === CHECK 4: BI SKU breakdown ===
  console.log('\n=== CHECK 4: BI SKU Breakdown ===');

  const biAlreadyNew = alreadyNew.filter(r => r.brand === 'BI');
  const biAutoMapped = autoMapped.filter(r => r.brand === 'BI');
  const biMappingTargets = [...new Set(
    dbMappings?.filter(m => m.brand_id === brandMap.get('BI')).map(m => m.current_sku.toUpperCase()) || []
  )];

  console.log(`  BI ALREADY_NEW_FORMAT in CSV: ${biAlreadyNew.length}`);
  console.log(`  BI AUTO_MAPPED in CSV: ${biAutoMapped.length}`);
  console.log(`  BI mapping targets in DB: ${biMappingTargets.length}`);

  const biProductSkus = dbProductSkus?.filter(p => p.brand_id === brandMap.get('BI')) || [];
  console.log(`  BI product_skus in DB: ${biProductSkus.length}`);

  // List all BI product_skus
  console.log('\n  BI Product SKUs in database:');
  biProductSkus.map(p => p.sku).sort().forEach(s => console.log(`    ${s}`));

  // === CHECK 5: COMPONENT status (should NOT be in product_skus) ===
  console.log('\n=== CHECK 5: COMPONENT entries (not products) ===');

  const components = byStatus['COMPONENT'] || [];
  console.log(`  ${components.length} COMPONENT entries in CSV (raw materials, not sellable products)`);
  console.log('  These should NOT be in product_skus - they go in the components table');

  // === SUMMARY ===
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`CSV Total: ${rows.length} rows`);
  console.log(`  AUTO_MAPPED: ${autoMapped.length} → ${dbMappings?.length || 0} in sku_mapping ✓`);
  console.log(`  ALREADY_NEW_FORMAT: ${alreadyNew.length} → included in product_skus`);
  console.log(`  COMPONENT: ${components.length} → for components table (not product_skus)`);
  console.log(`\nProduct SKUs: ${dbProductSkus?.length || 0} total`);
  console.log(`  (from ${mappingTargets.length} mapping targets + ${alreadyNew.length} already-new = ${mappingTargets.length + alreadyNew.length} expected)`);

  // Check for any overlap
  const overlap = alreadyNew.filter(r => mappingTargets.includes(r.legacy_sku.toUpperCase()));
  if (overlap.length > 0) {
    console.log(`  (${overlap.length} overlap between mapping targets and already-new)`);
  }
}

audit().catch(console.error);
