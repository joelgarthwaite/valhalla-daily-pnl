// Excel parser for invoice files using SheetJS

import type { ParseResult, RawRow } from './types';
import { detectColumns, applyMapping } from './column-detector';

// Import SheetJS dynamically
let XLSX: typeof import('xlsx') | null = null;

async function loadXLSX() {
  if (XLSX) return XLSX;
  XLSX = await import('xlsx');
  return XLSX;
}

/**
 * Parse Excel file (.xlsx or .xls) into structured data
 */
export async function parseXLSX(buffer: ArrayBuffer): Promise<ParseResult> {
  const warnings: string[] = [];

  try {
    const xlsx = await loadXLSX();

    // Read workbook from buffer
    const workbook = xlsx.read(buffer, { type: 'array' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        data: [],
        headers: [],
        rawRows: [],
        columnMapping: null,
        needsManualMapping: false,
        warnings: [],
        error: 'Excel file contains no sheets',
        fileType: 'xlsx',
      };
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const jsonData = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as string[][];

    if (jsonData.length < 2) {
      return {
        success: false,
        data: [],
        headers: [],
        rawRows: [],
        columnMapping: null,
        needsManualMapping: false,
        warnings: [],
        error: 'Sheet must contain at least a header row and one data row',
        fileType: 'xlsx',
      };
    }

    // First row is headers
    const headers = jsonData[0].map((h) => String(h || '').trim());

    // Remaining rows are data
    const rawRows: RawRow[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const rowData = jsonData[i];

      // Skip completely empty rows
      if (rowData.every((cell) => !cell || String(cell).trim() === '')) {
        continue;
      }

      const row: RawRow = {};
      headers.forEach((header, index) => {
        row[header] = rowData[index] !== undefined ? String(rowData[index]) : '';
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
        fileType: 'xlsx',
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
        fileType: 'xlsx',
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
      fileType: 'xlsx',
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      rawRows: [],
      columnMapping: null,
      needsManualMapping: false,
      warnings: [],
      error: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fileType: 'xlsx',
    };
  }
}
