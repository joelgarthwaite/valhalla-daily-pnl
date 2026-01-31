/**
 * Test velocity calculation with SKU mappings
 * Run with: npx tsx scripts/test-velocity.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex);
          const value = trimmed.substring(eqIndex + 1).replace(/^["']|["']$/g, '');
          process.env[key] = value;
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

async function testVelocity() {
  console.log('=== Velocity Calculation Test ===\n');

  const days = 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  // 1. Check components with BOM entries
  console.log('1. Checking components and BOM...');
  const { data: components } = await supabase
    .from('components')
    .select('id, sku, name')
    .eq('is_active', true)
    .limit(10);

  console.log(`   Found ${components?.length || 0} active components`);

  const { data: bomEntries } = await supabase
    .from('bom')
    .select('component_id, product_sku, quantity');

  console.log(`   Found ${bomEntries?.length || 0} BOM entries`);

  if (!bomEntries || bomEntries.length === 0) {
    console.log('\n⚠️  No BOM entries found - velocity calculation requires BOM setup');
    console.log('   BOM links product SKUs (like B1-VANT-GT-C1) to components (like Small Dome Case)');
    return;
  }

  // 2. Check SKU mappings
  console.log('\n2. Checking SKU mappings...');
  const productSkus = [...new Set(bomEntries.map(b => b.product_sku.toUpperCase()))];
  console.log(`   Product SKUs in BOM: ${productSkus.length}`);

  const { data: skuMappings } = await supabase
    .from('sku_mapping')
    .select('old_sku, current_sku');

  console.log(`   Total SKU mappings: ${skuMappings?.length || 0}`);

  // Check which mappings are relevant (map to BOM product SKUs)
  const relevantMappings = skuMappings?.filter(m =>
    productSkus.includes(m.current_sku.toUpperCase())
  ) || [];

  console.log(`   Relevant mappings (target in BOM): ${relevantMappings.length}`);

  if (relevantMappings.length > 0) {
    console.log('\n   Sample relevant mappings:');
    relevantMappings.slice(0, 5).forEach(m => {
      console.log(`     ${m.old_sku} → ${m.current_sku}`);
    });
  }

  // 3. Check orders with line items
  console.log(`\n3. Checking orders (last ${days} days)...`);

  // Build set of all SKUs to look for
  const allSkusToFind = new Set(productSkus);
  for (const mapping of skuMappings || []) {
    allSkusToFind.add(mapping.old_sku.toUpperCase());
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_date, line_items')
    .gte('order_date', startDateStr)
    .is('excluded_at', null);

  console.log(`   Orders in period: ${orders?.length || 0}`);

  // Extract line items
  let totalLineItems = 0;
  let matchingLineItems = 0;
  const skuCounts: Record<string, { count: number; qty: number }> = {};

  for (const order of orders || []) {
    const lineItems = order.line_items as Array<{ sku?: string; quantity?: number }> | null;
    if (!lineItems || !Array.isArray(lineItems)) continue;

    for (const item of lineItems) {
      totalLineItems++;
      if (item.sku && allSkusToFind.has(item.sku.toUpperCase())) {
        matchingLineItems++;
        const skuUpper = item.sku.toUpperCase();
        if (!skuCounts[skuUpper]) {
          skuCounts[skuUpper] = { count: 0, qty: 0 };
        }
        skuCounts[skuUpper].count++;
        skuCounts[skuUpper].qty += item.quantity || 1;
      }
    }
  }

  console.log(`   Total line items: ${totalLineItems}`);
  console.log(`   Matching SKUs (in BOM or mappings): ${matchingLineItems}`);

  // Show top selling SKUs
  const sortedSkus = Object.entries(skuCounts)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 10);

  if (sortedSkus.length > 0) {
    console.log('\n   Top 10 SKUs by quantity:');
    for (const [sku, data] of sortedSkus) {
      // Check if this is a mapped SKU
      const mapping = skuMappings?.find(m => m.old_sku.toUpperCase() === sku);
      const isMapped = !!mapping;
      const label = isMapped ? `→ ${mapping!.current_sku}` : '(current)';
      console.log(`     ${sku}: ${data.qty} units (${data.count} orders) ${label}`);
    }
  }

  // 4. Calculate velocity for a sample component
  console.log('\n4. Sample velocity calculation...');

  if (components && components.length > 0 && bomEntries.length > 0) {
    // Find a component with BOM entries
    const componentWithBom = components.find(c =>
      bomEntries.some(b => b.component_id === c.id)
    );

    if (componentWithBom) {
      const componentBom = bomEntries.filter(b => b.component_id === componentWithBom.id);

      console.log(`\n   Component: ${componentWithBom.name} (${componentWithBom.sku})`);
      console.log(`   BOM entries: ${componentBom.length}`);
      componentBom.forEach(b => {
        console.log(`     - ${b.product_sku} × ${b.quantity}`);
      });

      // Calculate manually to show the process
      let totalUnits = 0;
      let orderCount = 0;
      const bomSkus = componentBom.map(b => b.product_sku.toUpperCase());

      // Build SKU -> BOM qty map
      const skuToBomQty = new Map<string, number>();
      for (const bom of componentBom) {
        skuToBomQty.set(bom.product_sku.toUpperCase(), bom.quantity);
      }

      // Build old -> current SKU map
      const oldToCurrentMap = new Map<string, string>();
      for (const mapping of skuMappings || []) {
        if (bomSkus.includes(mapping.current_sku.toUpperCase())) {
          oldToCurrentMap.set(mapping.old_sku.toUpperCase(), mapping.current_sku.toUpperCase());
        }
      }

      console.log(`\n   Legacy SKUs that map to these products: ${oldToCurrentMap.size}`);

      for (const order of orders || []) {
        const lineItems = order.line_items as Array<{ sku?: string; quantity?: number }> | null;
        if (!lineItems || !Array.isArray(lineItems)) continue;

        for (const item of lineItems) {
          if (!item.sku) continue;

          let resolvedSku = item.sku.toUpperCase();

          // Check if it's a legacy SKU that maps to a BOM product
          const mappedSku = oldToCurrentMap.get(resolvedSku);
          if (mappedSku) {
            resolvedSku = mappedSku;
          }

          // Check if resolved SKU is in BOM
          const bomQty = skuToBomQty.get(resolvedSku);
          if (bomQty) {
            const units = (item.quantity || 1) * bomQty;
            totalUnits += units;
            orderCount++;
          }
        }
      }

      const velocity = days > 0 ? totalUnits / days : 0;

      console.log(`\n   Results for ${componentWithBom.name}:`);
      console.log(`     Period: ${days} days (${startDateStr} to today)`);
      console.log(`     Total units consumed: ${totalUnits}`);
      console.log(`     Order line items: ${orderCount}`);
      console.log(`     Velocity: ${velocity.toFixed(2)} units/day (${(velocity * 7).toFixed(1)}/week)`);
    } else {
      console.log('   No components have BOM entries - cannot calculate velocity');
    }
  }

  console.log('\n=== Test Complete ===');
}

testVelocity().catch(console.error);
