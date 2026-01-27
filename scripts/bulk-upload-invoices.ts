/**
 * Bulk Invoice Upload Script
 *
 * Processes DHL invoice CSV files and uploads them via the API.
 * - CBGR* files: Shipping costs → "overwrite_all" mode
 * - CBGIR* files: Duties/taxes → "add_to_existing" mode
 *
 * Usage: npx tsx scripts/bulk-upload-invoices.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const INVOICE_DIR = '/Users/JoelGarthwaite/Downloads/DocumentDownload_extracted';
const API_BASE = 'http://localhost:3000'; // Change to production URL if needed

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
    action: string;
    reason: string;
    shipping_cost: number;
    existing_cost?: number;
  }>;
  warnings: string[];
}

interface ProcessResult {
  results: Array<{
    tracking_number: string;
    status: string;
    action: string;
    message: string;
  }>;
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

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse a DHL invoice CSV file
 */
function parseDHLInvoice(filePath: string): ParsedInvoice[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 2) {
    console.log(`  Skipping ${path.basename(filePath)}: No data rows`);
    return [];
  }

  const headers = parseCSVLine(lines[0]);

  // Find column indices
  const lineTypeIdx = headers.findIndex(h => h.toLowerCase() === 'line type');
  const trackingIdx = headers.findIndex(h => h.toLowerCase() === 'shipment number');
  const costIdx = headers.findIndex(h => h.toLowerCase() === 'total amount (excl. vat)');
  const currencyIdx = headers.findIndex(h => h.toLowerCase() === 'currency');
  const serviceIdx = headers.findIndex(h => h.toLowerCase() === 'product name');
  const weightIdx = headers.findIndex(h => h.toLowerCase() === 'weight (kg)');
  const dateIdx = headers.findIndex(h => h.toLowerCase() === 'shipment date');

  if (trackingIdx === -1 || costIdx === -1) {
    console.log(`  Skipping ${path.basename(filePath)}: Missing required columns`);
    return [];
  }

  const invoices: ParsedInvoice[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Only process shipment lines (type "S"), not invoice summary lines (type "I")
    const lineType = lineTypeIdx >= 0 ? values[lineTypeIdx] : '';
    if (lineType === 'I') continue;

    const tracking = values[trackingIdx]?.trim();
    const cost = parseFloat(values[costIdx]) || 0;

    if (!tracking || cost <= 0) continue;

    invoices.push({
      tracking_number: tracking,
      shipping_cost: cost,
      currency: currencyIdx >= 0 ? values[currencyIdx] || 'GBP' : 'GBP',
      service_type: serviceIdx >= 0 ? values[serviceIdx] || '' : '',
      weight_kg: weightIdx >= 0 ? parseFloat(values[weightIdx]) || 0 : 0,
      shipping_date: dateIdx >= 0 ? values[dateIdx] || '' : '',
    });
  }

  return invoices;
}

/**
 * Call the analyze API
 */
async function analyzeInvoices(
  invoices: ParsedInvoice[],
  carrier: 'dhl' | 'royalmail',
  uploadMode: string
): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/api/invoices/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoices, carrier, uploadMode }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Call the process API
 */
async function processInvoices(
  records: AnalysisResult['records'],
  carrier: 'dhl' | 'royalmail',
  uploadMode: string,
  fileName: string
): Promise<ProcessResult> {
  const response = await fetch(`${API_BASE}/api/invoices/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, carrier, uploadMode, fileName }),
  });

  if (!response.ok) {
    throw new Error(`Processing failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Process a single invoice file
 */
async function processFile(
  filePath: string,
  uploadMode: 'overwrite_all' | 'add_to_existing'
): Promise<{ fileName: string; success: boolean; summary?: ProcessResult['summary']; error?: string }> {
  const fileName = path.basename(filePath);

  try {
    // Parse the file
    const invoices = parseDHLInvoice(filePath);

    if (invoices.length === 0) {
      return { fileName, success: false, error: 'No valid invoices found' };
    }

    // Analyze
    const analysis = await analyzeInvoices(invoices, 'dhl', uploadMode);

    // Check if there's anything to process
    const hasWork = analysis.toCreate > 0 || analysis.toUpdate > 0 || analysis.toAdd > 0;
    if (!hasWork) {
      return {
        fileName,
        success: true,
        summary: {
          total: analysis.total,
          created: 0,
          updated: 0,
          added: 0,
          skipped: analysis.toSkip,
          errors: 0,
          blocked: analysis.toBlock,
        }
      };
    }

    // Process
    const result = await processInvoices(analysis.records, 'dhl', uploadMode, fileName);

    return { fileName, success: true, summary: result.summary };
  } catch (error) {
    return {
      fileName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('DHL Invoice Bulk Upload');
  console.log('='.repeat(60));
  console.log();

  // Get all CSV files
  const files = fs.readdirSync(INVOICE_DIR)
    .filter(f => f.endsWith('.csv') && !f.startsWith('.'))
    .sort();

  const shippingFiles = files.filter(f => f.startsWith('CBGR'));
  const dutiesFiles = files.filter(f => f.startsWith('CBGIR'));

  console.log(`Found ${shippingFiles.length} shipping invoices (CBGR*)`);
  console.log(`Found ${dutiesFiles.length} duties/taxes invoices (CBGIR*)`);
  console.log();

  // Summary totals
  const totals = {
    shipping: { created: 0, updated: 0, skipped: 0, blocked: 0, errors: 0 },
    duties: { added: 0, skipped: 0, blocked: 0, errors: 0 },
  };

  // Process shipping invoices first (overwrite_all mode)
  console.log('-'.repeat(60));
  console.log('STEP 1: Processing Shipping Invoices (Overwrite All)');
  console.log('-'.repeat(60));

  for (const file of shippingFiles) {
    const filePath = path.join(INVOICE_DIR, file);
    process.stdout.write(`  ${file}... `);

    const result = await processFile(filePath, 'overwrite_all');

    if (result.success && result.summary) {
      totals.shipping.created += result.summary.created;
      totals.shipping.updated += result.summary.updated;
      totals.shipping.skipped += result.summary.skipped;
      totals.shipping.blocked += result.summary.blocked;
      totals.shipping.errors += result.summary.errors;

      console.log(`✓ Created: ${result.summary.created}, Updated: ${result.summary.updated}, Skipped: ${result.summary.skipped}`);
    } else {
      totals.shipping.errors++;
      console.log(`✗ ${result.error}`);
    }
  }

  console.log();
  console.log('Shipping Summary:');
  console.log(`  Created: ${totals.shipping.created}`);
  console.log(`  Updated: ${totals.shipping.updated}`);
  console.log(`  Skipped: ${totals.shipping.skipped}`);
  console.log(`  Blocked: ${totals.shipping.blocked}`);
  console.log(`  Errors: ${totals.shipping.errors}`);
  console.log();

  // Process duties/taxes invoices (add_to_existing mode)
  console.log('-'.repeat(60));
  console.log('STEP 2: Processing Duties/Taxes Invoices (Add to Existing)');
  console.log('-'.repeat(60));

  for (const file of dutiesFiles) {
    const filePath = path.join(INVOICE_DIR, file);
    process.stdout.write(`  ${file}... `);

    const result = await processFile(filePath, 'add_to_existing');

    if (result.success && result.summary) {
      totals.duties.added += result.summary.added;
      totals.duties.skipped += result.summary.skipped;
      totals.duties.blocked += result.summary.blocked;
      totals.duties.errors += result.summary.errors;

      console.log(`✓ Added: ${result.summary.added}, Skipped: ${result.summary.skipped}`);
    } else {
      totals.duties.errors++;
      console.log(`✗ ${result.error}`);
    }
  }

  console.log();
  console.log('Duties/Taxes Summary:');
  console.log(`  Added to existing: ${totals.duties.added}`);
  console.log(`  Skipped: ${totals.duties.skipped}`);
  console.log(`  Blocked: ${totals.duties.blocked}`);
  console.log(`  Errors: ${totals.duties.errors}`);
  console.log();

  console.log('='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);
