// Main file parser - entry point for all file types

import type { ParseResult, FileType, ColumnMapping } from './types';
import { parseCSV } from './csv-parser';
import { parseXLSX } from './xlsx-parser';
import { parsePDF } from './pdf-parser';
import { applyMapping } from './column-detector';

// File type magic bytes
const FILE_SIGNATURES = {
  xlsx: [0x50, 0x4b, 0x03, 0x04], // ZIP (Office Open XML)
  xls: [0xd0, 0xcf, 0x11, 0xe0], // OLE compound document
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
};

/**
 * Detect file type from magic bytes
 */
function detectFileType(buffer: ArrayBuffer): FileType {
  const bytes = new Uint8Array(buffer.slice(0, 8));

  // Check PDF
  if (
    bytes[0] === FILE_SIGNATURES.pdf[0] &&
    bytes[1] === FILE_SIGNATURES.pdf[1] &&
    bytes[2] === FILE_SIGNATURES.pdf[2] &&
    bytes[3] === FILE_SIGNATURES.pdf[3]
  ) {
    return 'pdf';
  }

  // Check XLSX (ZIP format)
  if (
    bytes[0] === FILE_SIGNATURES.xlsx[0] &&
    bytes[1] === FILE_SIGNATURES.xlsx[1] &&
    bytes[2] === FILE_SIGNATURES.xlsx[2] &&
    bytes[3] === FILE_SIGNATURES.xlsx[3]
  ) {
    return 'xlsx';
  }

  // Check XLS (OLE)
  if (
    bytes[0] === FILE_SIGNATURES.xls[0] &&
    bytes[1] === FILE_SIGNATURES.xls[1] &&
    bytes[2] === FILE_SIGNATURES.xls[2] &&
    bytes[3] === FILE_SIGNATURES.xls[3]
  ) {
    return 'xls';
  }

  return 'unknown';
}

/**
 * Get human-readable file type name
 */
export function getFileTypeName(fileType: FileType): string {
  switch (fileType) {
    case 'csv':
      return 'CSV';
    case 'xlsx':
      return 'Excel (XLSX)';
    case 'xls':
      return 'Excel (XLS)';
    case 'pdf':
      return 'PDF';
    default:
      return 'Unknown';
  }
}

/**
 * Parse any supported file type
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // First try to detect by magic bytes
  let fileType = detectFileType(buffer);

  // Fall back to extension for CSV (no magic bytes)
  if (fileType === 'unknown') {
    if (extension === 'csv' || extension === 'txt') {
      fileType = 'csv';
    } else if (extension === 'xlsx') {
      fileType = 'xlsx';
    } else if (extension === 'xls') {
      fileType = 'xls';
    } else if (extension === 'pdf') {
      fileType = 'pdf';
    }
  }

  switch (fileType) {
    case 'csv': {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(buffer);
      return parseCSV(text);
    }

    case 'xlsx':
    case 'xls':
      return parseXLSX(buffer);

    case 'pdf':
      return parsePDF(buffer);

    default:
      return {
        success: false,
        data: [],
        headers: [],
        rawRows: [],
        columnMapping: null,
        needsManualMapping: false,
        warnings: [],
        error: `Unsupported file type: ${extension || 'unknown'}. Please use CSV, Excel (.xlsx/.xls), or PDF.`,
        fileType: 'unknown',
      };
  }
}

/**
 * Apply manual column mapping to a parse result
 */
export function applyManualMapping(
  parseResult: ParseResult,
  mapping: ColumnMapping
): ParseResult {
  const { data, warnings: mappingWarnings } = applyMapping(
    parseResult.rawRows,
    parseResult.headers,
    mapping
  );

  return {
    ...parseResult,
    data,
    columnMapping: mapping,
    needsManualMapping: false,
    warnings: [...parseResult.warnings, ...mappingWarnings],
  };
}
