/**
 * Populate Product SKUs table with current B-series SKUs
 *
 * Sources:
 * 1. current_sku values from sku_mapping (targets of legacy mappings)
 * 2. ALREADY_NEW_FORMAT SKUs from the CSV (already B-series, no mapping needed)
 *
 * Run with: npx tsx scripts/populate-product-skus.ts
 * Dry run:  npx tsx scripts/populate-product-skus.ts --dry-run
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

// Generate a human-readable name from B-series SKU
function generateProductName(sku: string, brand: string): string {
  // Parse B-series SKU format: B1-VANT-GT-C1-P or B1-ICON-CS-C1-CUS
  const parts = sku.split('-');

  const sizeMap: Record<string, string> = {
    'B1': 'Small',
    'B2': 'Medium',
    'B3': 'Large',
  };

  const styleMap: Record<string, string> = {
    'VANT': 'Vantage',
    'ICON': 'Icon',
    'HERI': 'Heritage',
    'PRES': 'Prestige',
    'AHW': 'American Hardwood',
  };

  const accessoryMap: Record<string, string> = {
    'GT': 'Golf Tee',
    'GT5': '5× Golf Tees',
    'BS': 'Ball Stem',
    'RS': 'Ring Stand',
    'RS2': 'Double Ring Stand',
    'RS3': 'Triple Ring Stand',
    'CS': 'Coin Stand',
    'MSP': 'Multi Stand Pack',
  };

  const woodMap: Record<string, string> = {
    'OAK': 'Oak',
    'AHW': 'Mahogany',
    'OLIVE': 'Olive',
  };

  const designMap: Record<string, string> = {
    'HIO': 'Hole in One',
    'LEG': 'Legendary',
    'CHAMP': 'Champion',
    'GC': 'Golf Course',
    'CUS': 'Custom',
    'BIRDIE': 'Birdie',
    'EAGLE': 'Eagle',
    'ALBATROSS': 'Albatross',
    'PAR': 'Par',
  };

  let name = '';
  let size = '';
  let style = '';
  let wood = '';
  let accessory = '';
  let caseSize = '';
  let design = '';
  let isPersonalized = false;
  let hasBall = false;

  for (const part of parts) {
    if (sizeMap[part]) size = sizeMap[part];
    else if (styleMap[part]) style = styleMap[part];
    else if (woodMap[part]) wood = woodMap[part];
    else if (accessoryMap[part]) accessory = accessoryMap[part];
    else if (part.startsWith('C') && part.length === 2) caseSize = part;
    else if (designMap[part]) design = designMap[part];
    else if (part === 'P') isPersonalized = true;
    else if (part === 'BALL') hasBall = true;
  }

  // Build name
  if (size) name += size + ' ';
  if (style) name += style + ' ';
  if (wood && wood !== 'Mahogany') name += wood + ' '; // Mahogany is default for Heritage/Prestige

  // Add product type based on brand
  if (brand === 'DC') {
    name += 'Golf Ball Display Case';
  } else if (brand === 'BI') {
    if (accessory.includes('Ring')) {
      name += 'Ring Display Case';
    } else if (accessory.includes('Coin')) {
      name += 'Coin Display Case';
    } else {
      name += 'Memory Display Case';
    }
  } else {
    name += 'Display Case';
  }

  // Add design
  if (design && design !== 'Custom') name += ` - ${design}`;

  // Add modifiers
  if (isPersonalized) name += ' (Personalized)';
  if (hasBall) name += ' + Ball';

  return name.trim();
}

async function populate() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== Populate Product SKUs ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Get brand IDs
  const { data: brands } = await supabase
    .from('brands')
    .select('id, code');

  const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);
  console.log(`Brands: DC=${brandMap.get('DC')}, BI=${brandMap.get('BI')}`);

  // 1. Get unique current_sku values from sku_mapping
  const { data: mappings } = await supabase
    .from('sku_mapping')
    .select('current_sku, brand_id');

  const mappedSkus = new Map<string, string | null>(); // sku -> brand_id
  for (const m of mappings || []) {
    const sku = m.current_sku.toUpperCase();
    if (!mappedSkus.has(sku)) {
      mappedSkus.set(sku, m.brand_id);
    }
  }
  console.log(`\nUnique current_sku from mappings: ${mappedSkus.size}`);

  // 2. Get ALREADY_NEW_FORMAT SKUs from CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const csvRows = parseCSV(csvContent);

  const alreadyNewFormat = csvRows.filter(r => r.status === 'ALREADY_NEW_FORMAT');
  console.log(`ALREADY_NEW_FORMAT SKUs from CSV: ${alreadyNewFormat.length}`);

  // Combine all SKUs
  const allSkus = new Map<string, { brandCode: string; platforms: string[] }>();

  // Add mapped SKUs
  for (const [sku, brandId] of mappedSkus) {
    const brandCode = brands?.find(b => b.id === brandId)?.code || 'DC';
    allSkus.set(sku, { brandCode, platforms: ['shopify', 'etsy'] });
  }

  // Add ALREADY_NEW_FORMAT SKUs
  for (const row of alreadyNewFormat) {
    const sku = row.legacy_sku.toUpperCase(); // For ALREADY_NEW_FORMAT, legacy_sku IS the new sku
    if (!allSkus.has(sku)) {
      const platforms = row.platforms.split(',').map(p => p.trim().toLowerCase()).filter(p => p);
      allSkus.set(sku, { brandCode: row.brand, platforms });
    }
  }

  console.log(`\nTotal unique B-series SKUs to add: ${allSkus.size}`);

  // Check existing product_skus
  const { data: existing } = await supabase
    .from('product_skus')
    .select('sku');

  const existingSkus = new Set(existing?.map(e => e.sku.toUpperCase()) || []);
  console.log(`Already in product_skus: ${existingSkus.size}`);

  // Prepare inserts
  const toInsert: Array<{
    sku: string;
    name: string;
    brand_id: string | null;
    status: string;
    platforms: string[];
    notes: string;
  }> = [];

  for (const [sku, info] of allSkus) {
    if (existingSkus.has(sku)) continue;

    const brandId = brandMap.get(info.brandCode) || null;
    const name = generateProductName(sku, info.brandCode);

    toInsert.push({
      sku,
      name,
      brand_id: brandId,
      status: 'active',
      platforms: info.platforms,
      notes: 'Auto-imported from SKU audit',
    });
  }

  console.log(`New SKUs to insert: ${toInsert.length}`);

  // Show preview
  console.log('\nPreview (first 15):');
  toInsert.slice(0, 15).forEach(p => {
    console.log(`  ${p.sku}`);
    console.log(`    → ${p.name}`);
  });

  if (toInsert.length > 15) {
    console.log(`  ... and ${toInsert.length - 15} more`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made. Remove --dry-run to insert.');
    return;
  }

  // Insert in batches
  console.log('\nInserting...');
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('product_skus')
      .insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} inserted`);
    }
  }

  console.log(`\n✅ Done! Inserted ${inserted} product SKUs`);

  // Verify
  const { count } = await supabase
    .from('product_skus')
    .select('*', { count: 'exact', head: true });

  console.log(`Total in product_skus table: ${count}`);
}

populate().catch(console.error);
