/**
 * Check inventory tables status
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

async function check() {
  console.log('=== Inventory Tables Status ===\n');

  // Check product_skus table
  const { data: productSkus, count: skuCount, error: skuError } = await supabase
    .from('product_skus')
    .select('*', { count: 'exact' });

  console.log('1. Product SKUs Table');
  console.log(`   Count: ${skuCount}`);
  if (skuError) console.log(`   Error: ${skuError.message}`);
  if (productSkus && productSkus.length > 0) {
    console.log('   Sample entries:');
    productSkus.slice(0, 5).forEach(p => {
      console.log(`     - ${p.sku}: ${p.name} (${p.status})`);
    });
  } else {
    console.log('   ⚠️  TABLE IS EMPTY - No product SKUs defined');
  }

  // Check BOM table
  const { data: bom, count: bomCount } = await supabase
    .from('bom')
    .select('*, components(name, sku)', { count: 'exact' });

  console.log('\n2. BOM (Bill of Materials) Table');
  console.log(`   Count: ${bomCount}`);
  if (bom && bom.length > 0) {
    console.log('   Entries:');
    bom.forEach(b => {
      const comp = b.components as { name: string; sku: string } | null;
      console.log(`     - ${b.product_sku} uses ${b.quantity}× ${comp?.name || b.component_id}`);
    });
  } else {
    console.log('   ⚠️  TABLE IS EMPTY - No BOM entries defined');
  }

  // Check components
  const { data: components, count: compCount } = await supabase
    .from('components')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  console.log('\n3. Components Table');
  console.log(`   Active count: ${compCount}`);
  if (components && components.length > 0) {
    console.log('   Sample components:');
    components.slice(0, 5).forEach(c => {
      console.log(`     - ${c.sku}: ${c.name}`);
    });
  }

  // Check SKU mappings
  const { count: mappingCount } = await supabase
    .from('sku_mapping')
    .select('*', { count: 'exact', head: true });

  console.log('\n4. SKU Mappings Table');
  console.log(`   Count: ${mappingCount}`);

  console.log('\n=== Summary ===');
  console.log(`Product SKUs: ${skuCount || 0} (${skuCount === 0 ? '❌ EMPTY' : '✅'})`);
  console.log(`BOM Entries:  ${bomCount || 0} (${bomCount === 0 ? '❌ EMPTY' : '✅'})`);
  console.log(`Components:   ${compCount || 0} (${compCount === 0 ? '❌ EMPTY' : '✅'})`);
  console.log(`SKU Mappings: ${mappingCount || 0} (${mappingCount === 0 ? '❌ EMPTY' : '✅'})`);

  if (skuCount === 0) {
    console.log('\n💡 The Product SKUs table is empty because no one has added products yet.');
    console.log('   This is a MANUAL step - you need to add your B-series SKUs here.');
    console.log('   The SKU Mapping page discovers historical SKUs from orders,');
    console.log('   but Product SKUs is your curated master catalog.');
  }
}

check().catch(console.error);
