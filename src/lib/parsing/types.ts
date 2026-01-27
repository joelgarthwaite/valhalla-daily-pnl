// Parsing types for invoice file uploads

export type FileType = 'csv' | 'xlsx' | 'xls' | 'pdf' | 'unknown';

export interface ParsedInvoice {
  tracking_number: string;
  shipping_cost: number;
  currency: string;
  service_type: string;
  weight_kg: number;
  shipping_date: string;
}

export interface ColumnMapping {
  tracking: number | null;
  cost: number | null;
  date: number | null;
  service: number | null;
  weight: number | null;
  currency: number | null;
}

export type RawRow = Record<string, string | number | null>;

export interface ParseResult {
  success: boolean;
  data: ParsedInvoice[];
  headers: string[];
  rawRows: RawRow[];
  columnMapping: ColumnMapping | null;
  needsManualMapping: boolean;
  warnings: string[];
  error?: string;
  fileType: FileType;
}

// Column detection keywords
export interface ColumnKeywords {
  tracking: string[];
  cost: string[];
  date: string[];
  service: string[];
  weight: string[];
  currency: string[];
}

// File magic bytes for type detection
export interface FileMagic {
  bytes: number[];
  type: FileType;
}
