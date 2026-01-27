// CSV parser for invoice files

import type { ParseResult, RawRow } from './types';
import { detectColumns, applyMapping } from './column-detector';

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
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
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
 * Parse CSV content into structured data
 */
export function parseCSV(content: string): ParseResult {
  const warnings: string[] = [];

  // Split into lines and filter empty
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      data: [],
      headers: [],
      rawRows: [],
      columnMapping: null,
      needsManualMapping: false,
      warnings: [],
      error: 'File must contain at least a header row and one data row',
      fileType: 'csv',
    };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rawRows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Skip rows with wrong number of columns
    if (values.length !== headers.length) {
      warnings.push(`Row ${i + 1} skipped: expected ${headers.length} columns, got ${values.length}`);
      continue;
    }

    const row: RawRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rawRows.push(row);
  }

  if (rawRows.length === 0) {
    return {
      success: false,
      data: [],
      headers,
      rawRows: [],
      columnMapping: null,
      needsManualMapping: false,
      warnings,
      error: 'No valid data rows found',
      fileType: 'csv',
    };
  }

  // Detect columns
  const detection = detectColumns(headers);

  // Check if manual mapping is needed
  if (detection.unmappedRequired.length > 0) {
    return {
      success: true,
      data: [],
      headers,
      rawRows,
      columnMapping: detection.mapping,
      needsManualMapping: true,
      warnings: [
        ...warnings,
        `Could not auto-detect columns: ${detection.unmappedRequired.join(', ')}`,
      ],
      fileType: 'csv',
    };
  }

  // Apply mapping to extract data
  const { data, warnings: mappingWarnings } = applyMapping(
    rawRows,
    headers,
    detection.mapping
  );
  warnings.push(...mappingWarnings);

  return {
    success: true,
    data,
    headers,
    rawRows,
    columnMapping: detection.mapping,
    needsManualMapping: false,
    warnings,
    fileType: 'csv',
  };
}
