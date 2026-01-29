/**
 * Batch process DHL invoices from a folder
 *
 * This script:
 * 1. Reads all CSV files from the specified folder
 * 2. Separates them by type (CBGR = shipping, CBGIR = duties)
 * 3. Processes CBGR (shipping) files first with "overwrite_all" mode
 * 4. Processes CBGIR (duties) files second with "add_to_existing" mode
 *
 * Usage:
 *   npx ts-node scripts/process-dhl-invoices.ts /path/to/invoices
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const API_BASE = 'http://localhost:3000';

interface ParsedInvoice {
  tracking_number: string;
  shipping_cost: number;
  currency: string;
  service_type: string;
  weight_kg: number;
  shipping_date: string;
}

interface AnalysisResult {
  total: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  toBlock: number;
  toAdd: number;
  records: Array<{
    tracking_number: string;
    shipping_cost: number;
    action: string;
    reason: string;
    existing_cost?: number;
  }>;
  warnings: string[];
}

interface ProcessResult {
  summary: {
    total: number;
    created: number;
    updated: number;
    added: number;
    skipped: number;
    errors: number;
    blocked: number;
  };
}

interface DHLInvoiceRecord {
  'Line Type': string;
  'Shipment Number': string;
  'Total amount (excl. VAT)': string;
  'Currency': string;
  'Product Name': string;
  'Weight (kg)': string;
  'Shipment Date': string;
  [key: string]: string;
}

/**
 * Parse a DHL invoice CSV file
 */
function parseDHLInvoice(filePath: string): ParsedInvoice[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as DHLInvoiceRecord[];

  const invoices: ParsedInvoice[] = [];

  for (const record of records) {
    // Skip invoice summary lines (Line Type = 'I')
    if (record['Line Type'] === 'I') continue;

    // Only process shipment lines (Line Type = 'S')
    if (record['Line Type'] !== 'S') continue;

    const trackingNumber = record['Shipment Number']?.trim();
    const totalAmount = parseFloat(record['Total amount (excl. VAT)']) || 0;
    const currency = record['Currency'] || 'GBP';
    const serviceType = record['Product Name']?.trim() || '';
    const weight = parseFloat(record['Weight (kg)']) || 0;
    const shipmentDate = record['Shipment Date']?.trim() || '';

    if (!trackingNumber || totalAmount <= 0) continue;

    // Format date from YYYYMMDD to YYYY-MM-DD
    let formattedDate = '';
    if (shipmentDate && shipmentDate.length === 8) {
      formattedDate = `${shipmentDate.slice(0, 4)}-${shipmentDate.slice(4, 6)}-${shipmentDate.slice(6, 8)}`;
    }

    invoices.push({
      tracking_number: trackingNumber,
      shipping_cost: totalAmount,
      currency,
      service_type: serviceType,
      weight_kg: weight,
      shipping_date: formattedDate,
    });
  }

  return invoices;
}

/**
 * Analyze invoices via API
 */
async function analyzeInvoices(
  invoices: ParsedInvoice[],
  uploadMode: string
): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/api/invoices/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoices,
      carrier: 'dhl',
      uploadMode,
    }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Process invoices via API
 */
async function processInvoices(
  analysis: AnalysisResult,
  uploadMode: string,
  fileName: string
): Promise<ProcessResult> {
  const response = await fetch(`${API_BASE}/api/invoices/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      records: analysis.records,
      carrier: 'dhl',
      uploadMode,
      fileName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Processing failed: ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  const folderPath = process.argv[2];

  if (!folderPath) {
    console.error('Usage: npx ts-node scripts/process-dhl-invoices.ts /path/to/invoices');
    process.exit(1);
  }

  if (!fs.existsSync(folderPath)) {
    console.error(`Folder not found: ${folderPath}`);
    process.exit(1);
  }

  // Get all CSV files
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));

  // Separate by type
  const shippingFiles = files.filter(f => f.startsWith('CBGR'));
  const dutiesFiles = files.filter(f => f.startsWith('CBGIR'));

  console.log(`Found ${files.length} CSV files:`);
  console.log(`  - ${shippingFiles.length} shipping invoices (CBGR)`);
  console.log(`  - ${dutiesFiles.length} duties invoices (CBGIR)`);
  console.log('');

  let totalShippingRecords = 0;
  let totalDutiesRecords = 0;
  let totalUpdated = 0;
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Step 1: Process shipping invoices first (overwrite_all)
  console.log('=== Step 1: Processing SHIPPING invoices (overwrite_all) ===\n');

  for (const fileName of shippingFiles) {
    const filePath = path.join(folderPath, fileName);
    const invoices = parseDHLInvoice(filePath);

    if (invoices.length === 0) {
      console.log(`  ${fileName}: No valid records`);
      continue;
    }

    totalShippingRecords += invoices.length;

    try {
      const analysis = await analyzeInvoices(invoices, 'overwrite_all');

      if (analysis.toCreate === 0 && analysis.toUpdate === 0) {
        console.log(`  ${fileName}: ${invoices.length} records - all skipped (no matches or unchanged)`);
        totalSkipped += analysis.toSkip;
        continue;
      }

      const result = await processInvoices(analysis, 'overwrite_all', fileName);

      console.log(`  ${fileName}: ${invoices.length} records - ${result.summary.updated} updated, ${result.summary.skipped} skipped`);
      totalUpdated += result.summary.updated;
      totalSkipped += result.summary.skipped;
      totalErrors += result.summary.errors;
    } catch (error) {
      console.error(`  ${fileName}: ERROR - ${error}`);
      totalErrors++;
    }
  }

  console.log('');

  // Step 2: Process duties invoices (add_to_existing)
  console.log('=== Step 2: Processing DUTIES invoices (add_to_existing) ===\n');

  for (const fileName of dutiesFiles) {
    const filePath = path.join(folderPath, fileName);
    const invoices = parseDHLInvoice(filePath);

    if (invoices.length === 0) {
      console.log(`  ${fileName}: No valid records`);
      continue;
    }

    totalDutiesRecords += invoices.length;

    try {
      const analysis = await analyzeInvoices(invoices, 'add_to_existing');

      if (analysis.toAdd === 0) {
        console.log(`  ${fileName}: ${invoices.length} records - all skipped (no existing shipments to add to)`);
        totalSkipped += analysis.toSkip;
        continue;
      }

      const result = await processInvoices(analysis, 'add_to_existing', fileName);

      console.log(`  ${fileName}: ${invoices.length} records - ${result.summary.added} duties added, ${result.summary.skipped} skipped`);
      totalAdded += result.summary.added;
      totalSkipped += result.summary.skipped;
      totalErrors += result.summary.errors;
    } catch (error) {
      console.error(`  ${fileName}: ERROR - ${error}`);
      totalErrors++;
    }
  }

  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total shipping records: ${totalShippingRecords}`);
  console.log(`Total duties records: ${totalDutiesRecords}`);
  console.log(`Updated: ${totalUpdated}`);
  console.log(`Duties added: ${totalAdded}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
}

main().catch(console.error);
