// PDF Parser using PDF.js

import type { ParseResult, RawRow } from './types';
import { detectColumns, applyMapping } from './column-detector';

// Dynamic import of pdfjs-dist for client-side only
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  return pdfjsLib;
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface TextLine {
  y: number;
  items: { x: number; text: string; width: number }[];
}

export async function parsePDF(buffer: ArrayBuffer): Promise<ParseResult> {
  const warnings: string[] = [];

  try {
    const pdfjs = await loadPdfJs();

    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      data: buffer,
      useSystemFonts: true,
    });

    let pdf;
    try {
      pdf = await loadingTask.promise;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        return {
          success: false,
          data: [],
          headers: [],
          rawRows: [],
          columnMapping: null,
          needsManualMapping: false,
          warnings: [],
          error: 'This PDF is encrypted. Please decrypt it and try again.',
          fileType: 'pdf',
        };
      }
      throw error;
    }

    const numPages = pdf.numPages;
    if (numPages === 0) {
      return {
        success: false,
        data: [],
        headers: [],
        rawRows: [],
        columnMapping: null,
        needsManualMapping: false,
        warnings: [],
        error: 'PDF contains no pages',
        fileType: 'pdf',
      };
    }

    // Extract text from all pages
    const allLines: TextLine[] = [];
    let hasText = false;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      if (textContent.items.length > 0) {
        hasText = true;
      }

      // Group text items by Y position to form lines
      const lines = groupTextByLines(textContent.items as TextItem[]);
      allLines.push(...lines);
    }

    // Check for scanned/image PDFs
    if (!hasText) {
      return {
        success: false,
        data: [],
        headers: [],
        rawRows: [],
        columnMapping: null,
        needsManualMapping: false,
        warnings: [],
        error: 'This PDF appears to be scanned or image-based and contains no extractable text. Please export the data as CSV or Excel instead.',
        fileType: 'pdf',
      };
    }

    // Convert lines to rows
    const { headers, rawRows } = linesToRows(allLines);

    if (headers.length === 0 || rawRows.length === 0) {
      return {
        success: false,
        data: [],
        headers: [],
        rawRows: [],
        columnMapping: null,
        needsManualMapping: false,
        warnings: [],
        error: 'Could not extract table structure from PDF. Please export the data as CSV or Excel instead.',
        fileType: 'pdf',
      };
    }

    warnings.push('PDF parsing may not preserve exact table structure. Please verify the extracted data.');

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
        warnings: [...warnings, `Could not auto-detect columns: ${detection.unmappedRequired.join(', ')}`],
        fileType: 'pdf',
      };
    }

    // Apply mapping to extract data
    const { data, warnings: mappingWarnings } = applyMapping(rawRows, headers, detection.mapping);
    warnings.push(...mappingWarnings);

    return {
      success: true,
      data,
      headers,
      rawRows,
      columnMapping: detection.mapping,
      needsManualMapping: false,
      warnings,
      fileType: 'pdf',
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
      error: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fileType: 'pdf',
    };
  }
}

// Group text items by Y position to form lines
function groupTextByLines(items: TextItem[]): TextLine[] {
  if (items.length === 0) return [];

  const lines: TextLine[] = [];
  const yTolerance = 5; // Pixels tolerance for same line

  for (const item of items) {
    const y = Math.round(item.transform[5]); // Y position from transform matrix
    const x = item.transform[4]; // X position

    // Find existing line with similar Y position
    const foundLine = lines.find(line => Math.abs(line.y - y) < yTolerance);

    if (foundLine) {
      foundLine.items.push({ x, text: item.str, width: item.width });
    } else {
      lines.push({
        y,
        items: [{ x, text: item.str, width: item.width }],
      });
    }
  }

  // Sort lines by Y position (top to bottom, so descending Y)
  lines.sort((a, b) => b.y - a.y);

  // Sort items within each line by X position (left to right)
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  return lines;
}

// Convert lines to headers and data rows
function linesToRows(lines: TextLine[]): { headers: string[]; rawRows: RawRow[] } {
  if (lines.length === 0) {
    return { headers: [], rawRows: [] };
  }

  // Determine column boundaries based on X positions across all lines
  const xPositions: number[] = [];
  for (const line of lines) {
    for (const item of line.items) {
      xPositions.push(item.x);
    }
  }

  // Cluster X positions to determine columns
  xPositions.sort((a, b) => a - b);
  const columnBoundaries = clusterPositions(xPositions, 30); // 30px tolerance

  if (columnBoundaries.length === 0) {
    return { headers: [], rawRows: [] };
  }

  // Convert lines to row arrays
  const rows: string[][] = [];
  for (const line of lines) {
    const row: string[] = new Array(columnBoundaries.length).fill('');

    for (const item of line.items) {
      // Find which column this item belongs to
      const colIndex = findColumn(item.x, columnBoundaries);
      if (colIndex >= 0) {
        // Append text to existing cell content (with space separator)
        row[colIndex] = row[colIndex] ? `${row[colIndex]} ${item.text}` : item.text;
      }
    }

    // Only include non-empty rows
    if (row.some(cell => cell.trim())) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    return { headers: [], rawRows: [] };
  }

  // First row is headers
  const headers = rows[0].map((h, i) => h.trim() || `Column_${i + 1}`);

  // Remaining rows are data
  const rawRows: RawRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawRow: RawRow = {};
    for (let j = 0; j < headers.length; j++) {
      rawRow[headers[j]] = row[j]?.trim() || '';
    }
    rawRows.push(rawRow);
  }

  return { headers, rawRows };
}

// Cluster X positions to determine column boundaries
function clusterPositions(positions: number[], tolerance: number): number[] {
  if (positions.length === 0) return [];

  const clusters: number[][] = [];
  let currentCluster = [positions[0]];

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - positions[i - 1] < tolerance) {
      currentCluster.push(positions[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [positions[i]];
    }
  }
  clusters.push(currentCluster);

  // Return the average of each cluster as the column position
  return clusters.map(cluster => {
    const sum = cluster.reduce((a, b) => a + b, 0);
    return sum / cluster.length;
  });
}

// Find which column a position belongs to
function findColumn(x: number, boundaries: number[]): number {
  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    const nextBoundary = boundaries[i + 1] ?? Infinity;
    if (x >= boundary - 15 && x < nextBoundary - 15) {
      return i;
    }
  }
  return -1;
}
