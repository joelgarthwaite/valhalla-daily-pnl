/**
 * Populate historic SKUs from sku_mapping into product_skus
 * These are legacy SKUs that have been replaced by B-series SKUs
 *
 * Run with: npx tsx scripts/populate-historic-skus.ts
 * Dry run:  npx tsx scripts/populate-historic-skus.ts --dry-run
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate a readable name from legacy SKU
function generateLegacyName(sku: string, brand: string): string {
  const upper = sku.toUpperCase();

  // Common patterns
  const patterns: Array<{ match: RegExp | string; name: string }> = [
    // DC Golf patterns
    { match: /^GBCVANTAGE/, name: 'Vantage Golf Ball Display Case' },
    { match: /^GBCPRESTIGEOAK/, name: 'Prestige Oak Golf Ball Display Case' },
    { match: /^GBCPRESTIGEMAH/, name: 'Prestige Mahogany Golf Ball Display Case' },
    { match: /^GBCPRESTIGE/, name: 'Prestige Golf Ball Display Case' },
    { match: /^GBCICON/, name: 'Icon Golf Ball Display Case' },
    { match: /^GBCHERITAGE/, name: 'Heritage Golf Ball Display Case' },
    { match: /^GBCHERITAGEMAH/, name: 'Heritage Mahogany Golf Ball Display Case' },
    { match: /^GBC/, name: 'Golf Ball Display Case' },

    // DC Ball Stem patterns (Baseball, Tennis, Cricket)
    { match: /^BBCVANTAGE/, name: 'Vantage Ball Display Case' },
    { match: /^BBCICON/, name: 'Icon Ball Display Case' },
    { match: /^BBC/, name: 'Ball Display Case' },

    // BI patterns
    { match: /^GBDSICON/, name: 'Icon Display Case' },
    { match: /^GBDS/, name: 'Display Case' },
    { match: /^COINSTAND/, name: 'Coin Stand' },
    { match: /^RINGSTAND/, name: 'Ring Stand' },

    // Size indicators
    { match: /^B1/, name: 'Small Display Case' },
    { match: /^B2/, name: 'Medium Display Case' },
    { match: /^B3/, name: 'Large Display Case' },
  ];

  let name = 'Display Case';

  for (const { match, name: patternName } of patterns) {
    if (typeof match === 'string') {
      if (upper.includes(match)) {
        name = patternName;
        break;
      }
    } else if (match.test(upper)) {
      name = patternName;
      break;
    }
  }

  // Add modifiers
  if (upper.endsWith('P') && !upper.endsWith('MSP')) {
    name += ' (Personalized)';
  }
  if (upper.includes('-BALL') || upper.includes('BALL')) {
    if (!name.includes('Ball')) {
      name += ' + Ball';
    }
  }
  if (upper.includes('HIO')) {
    name += ' - Hole in One';
  }

  // Add legacy tag
  name = `[Legacy] ${name}`;

  return name;
}

async function populate() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== Populate Historic SKUs ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Get brand IDs
  const { data: brands } = await supabase
    .from('brands')
    .select('id, code');

  const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);
  const brandIdMap = new Map(brands?.map(b => [b.id, b.code]) || []);

  // Get all legacy SKUs from sku_mapping
  const { data: mappings } = await supabase
    .from('sku_mapping')
    .select('old_sku, current_sku, brand_id');

  console.log(`Found ${mappings?.length || 0} SKU mappings`);

  // Get existing product_skus to avoid duplicates
  const { data: existing } = await supabase
    .from('product_skus')
    .select('sku');

  const existingSet = new Set(existing?.map(e => e.sku.toUpperCase()) || []);
  console.log(`Existing product_skus: ${existingSet.size}`);

  // Get order data for sales history
  const { data: orders } = await supabase
    .from('orders')
    .select('order_date, subtotal, line_items')
    .is('excluded_at', null);

  console.log(`Orders to scan: ${orders?.length || 0}`);

  // Build SKU sales stats
  const skuStats: Record<string, {
    orderCount: number;
    totalRevenue: number;
    firstOrder: string | null;
    lastOrder: string | null;
  }> = {};

  for (const order of orders || []) {
    const lineItems = order.line_items as Array<{ sku?: string; quantity?: number; price?: number }> | null;
    if (!lineItems || !Array.isArray(lineItems)) continue;

    for (const item of lineItems) {
      if (!item.sku) continue;
      const skuUpper = item.sku.toUpperCase();

      if (!skuStats[skuUpper]) {
        skuStats[skuUpper] = {
          orderCount: 0,
          totalRevenue: 0,
          firstOrder: null,
          lastOrder: null,
        };
      }

      skuStats[skuUpper].orderCount++;
      skuStats[skuUpper].totalRevenue += (item.price || 0) * (item.quantity || 1);

      const orderDate = order.order_date;
      if (!skuStats[skuUpper].firstOrder || orderDate < skuStats[skuUpper].firstOrder) {
        skuStats[skuUpper].firstOrder = orderDate;
      }
      if (!skuStats[skuUpper].lastOrder || orderDate > skuStats[skuUpper].lastOrder) {
        skuStats[skuUpper].lastOrder = orderDate;
      }
    }
  }

  // Prepare inserts for legacy SKUs
  const toInsert: Array<{
    sku: string;
    name: string;
    brand_id: string | null;
    status: string;
    platforms: string[];
    notes: string;
  }> = [];

  for (const mapping of mappings || []) {
    const legacySku = mapping.old_sku.toUpperCase();

    // Skip if already in product_skus
    if (existingSet.has(legacySku)) {
      continue;
    }

    const brandCode = brandIdMap.get(mapping.brand_id) || 'DC';
    const stats = skuStats[legacySku];

    const notes = stats
      ? `Historic SKU → ${mapping.current_sku} | ${stats.orderCount} orders | £${stats.totalRevenue.toFixed(0)} revenue | ${stats.firstOrder?.split('T')[0] || '?'} to ${stats.lastOrder?.split('T')[0] || '?'}`
      : `Historic SKU → ${mapping.current_sku}`;

    toInsert.push({
      sku: legacySku,
      name: generateLegacyName(legacySku, brandCode),
      brand_id: mapping.brand_id,
      status: 'historic',
      platforms: ['shopify', 'etsy'],
      notes,
    });
  }

  console.log(`\nNew historic SKUs to insert: ${toInsert.length}`);

  // Show preview
  console.log('\nPreview (first 15):');
  toInsert.slice(0, 15).forEach(p => {
    console.log(`  ${p.sku}`);
    console.log(`    → ${p.name}`);
    console.log(`    → ${p.notes}`);
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

  console.log(`\n✅ Done! Inserted ${inserted} historic product SKUs`);

  // Verify
  const { data: finalCounts } = await supabase
    .from('product_skus')
    .select('status');

  const statusCounts: Record<string, number> = {};
  for (const row of finalCounts || []) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }

  console.log('\nProduct SKUs by status:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }
}

populate().catch(console.error);
