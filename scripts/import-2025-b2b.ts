/**
 * Import 2025 Historic B2B Sales Data
 *
 * This script imports the B2B revenue data from the CSV spreadsheet.
 * Run with: npx tsx scripts/import-2025-b2b.ts
 *
 * Or use curl:
 * curl -X POST http://localhost:3000/api/b2b/import \
 *   -H "Content-Type: application/json" \
 *   -d '{"brand_code":"DC","customer_name":"Weekly B2B Sales","entries":[...]}'
 */

// 2025 B2B Revenue Data (Net of shipping - product subtotals only)
// Source: CSV spreadsheet
const B2B_DATA_2025 = {
  brand_code: 'DC',
  customer_name: 'Weekly B2B Sales',
  entries: [
    { year: 2025, week: 15, subtotal: 630, notes: 'Week 15 (Apr 7-13) B2B sales' },
    { year: 2025, week: 16, subtotal: 1614, notes: 'Week 16 (Apr 14-20) B2B sales' },
    { year: 2025, week: 32, subtotal: 1694, notes: 'Week 32 (Aug 4-10) B2B sales' },
    { year: 2025, week: 35, subtotal: 1664, notes: 'Week 35 (Aug 25-31) B2B sales' },
    { year: 2025, week: 41, subtotal: 1497, notes: 'Week 41 (Oct 6-12) B2B sales' },
    { year: 2025, week: 42, subtotal: 377, notes: 'Week 42 (Oct 13-19) B2B sales' },
    { year: 2025, week: 46, subtotal: 194, notes: 'Week 46 (Nov 10-16) B2B sales' },
    { year: 2025, week: 50, subtotal: 2275, notes: 'Week 50 (Dec 8-14) B2B sales' },
    { year: 2025, week: 51, subtotal: 956, notes: 'Week 51 (Dec 15-21) B2B sales' },
  ],
};

// Verify total matches expected
const expectedTotal = 10901;
const calculatedTotal = B2B_DATA_2025.entries.reduce((sum, e) => sum + e.subtotal, 0);

if (calculatedTotal !== expectedTotal) {
  console.error(`Total mismatch: Expected ${expectedTotal}, got ${calculatedTotal}`);
  process.exit(1);
}

console.log('2025 B2B Data Summary:');
console.log('======================');
console.log(`Brand: ${B2B_DATA_2025.brand_code}`);
console.log(`Customer: ${B2B_DATA_2025.customer_name}`);
console.log(`Entries: ${B2B_DATA_2025.entries.length} weeks`);
console.log(`Total: £${calculatedTotal.toLocaleString()}`);
console.log('');
console.log('Week breakdown:');
B2B_DATA_2025.entries.forEach((e) => {
  console.log(`  Week ${e.week}: £${e.subtotal.toLocaleString()}`);
});
console.log('');

async function importData() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/b2b/import`;

  console.log(`Importing to: ${url}`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(B2B_DATA_2025),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Import successful!');
      console.log(`  Imported: ${result.count} entries`);
      console.log(`  Skipped: ${result.skipped} (already exist)`);
      console.log(`  Total imported: £${result.total?.toLocaleString() || 0}`);
    } else {
      console.error('Import failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Request error:', error);
    process.exit(1);
  }
}

// Run if executed directly
importData();
