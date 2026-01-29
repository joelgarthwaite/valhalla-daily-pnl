/**
 * Xero API Client
 * Handles OAuth token management and bank balance fetching
 */

const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';

// Types
export interface XeroTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  scope: string;
}

export interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

export interface XeroBankAccount {
  AccountID: string;
  Code: string;
  Name: string;
  Type: string;
  TaxType: string;
  Description?: string;
  Class: string;
  SystemAccount?: string;
  EnablePaymentsToAccount?: boolean;
  ShowInExpenseClaims?: boolean;
  BankAccountNumber?: string;
  BankAccountType?: string;
  CurrencyCode: string;
  ReportingCode?: string;
  ReportingCodeName?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC: string;
  AddToWatchlist?: boolean;
}

export interface XeroBankSummaryRow {
  RowType: string;
  Cells?: Array<{
    Value: string;
    Attributes?: Array<{ Value: string; Id: string }>;
  }>;
  Rows?: XeroBankSummaryRow[];
  Title?: string;
}

export interface XeroBankSummaryReport {
  ReportID: string;
  ReportName: string;
  ReportType: string;
  ReportTitles: string[];
  ReportDate: string;
  UpdatedDateUTC: string;
  Rows: XeroBankSummaryRow[];
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType: 'BANK' | 'CREDITCARD';
  balance: number;
  currency: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  codeVerifier: string
): Promise<XeroTokenResponse> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshXeroToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<XeroTokenResponse> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Get connected Xero tenants (organizations)
 */
export async function getXeroTenants(accessToken: string): Promise<XeroTenant[]> {
  const response = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Xero tenants: ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch all bank accounts from Xero
 */
export async function fetchBankAccounts(
  accessToken: string,
  tenantId: string
): Promise<XeroBankAccount[]> {
  const response = await fetch(`${XERO_API_BASE}/Accounts?where=Type=="BANK" OR Type=="CREDITCARD"`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch bank accounts: ${errorText}`);
  }

  const data = await response.json();
  return data.Accounts || [];
}

/**
 * Fetch bank summary report with current balances
 */
export async function fetchBankSummary(
  accessToken: string,
  tenantId: string
): Promise<XeroBankSummaryReport> {
  const response = await fetch(`${XERO_API_BASE}/Reports/BankSummary`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch bank summary: ${errorText}`);
  }

  const data = await response.json();
  return data.Reports?.[0];
}

/**
 * Parse bank summary report to extract account balances
 */
export function parseBankSummaryReport(report: XeroBankSummaryReport): AccountBalance[] {
  const balances: AccountBalance[] = [];

  if (!report?.Rows) return balances;

  for (const section of report.Rows) {
    // Skip header rows
    if (section.RowType !== 'Section') continue;

    const sectionTitle = section.Title?.toLowerCase() || '';
    const accountType: 'BANK' | 'CREDITCARD' = sectionTitle.includes('credit card')
      ? 'CREDITCARD'
      : 'BANK';

    // Process rows within the section
    if (section.Rows) {
      for (const row of section.Rows) {
        if (row.RowType !== 'Row' || !row.Cells || row.Cells.length < 2) continue;

        const accountName = row.Cells[0]?.Value || '';
        const balanceStr = row.Cells[row.Cells.length - 1]?.Value || '0';
        const balance = parseFloat(balanceStr.replace(/[^0-9.-]/g, '')) || 0;

        // Get account ID from attributes if available
        const accountId = row.Cells[0]?.Attributes?.find(a => a.Id === 'account')?.Value || '';

        if (accountName && accountName !== 'Total') {
          balances.push({
            accountId,
            accountName,
            accountCode: '',
            accountType,
            balance,
            currency: 'GBP', // Default, could be extracted from report
          });
        }
      }
    }
  }

  return balances;
}

/**
 * Fetch all account balances for a Xero tenant
 */
export async function fetchAllBalances(
  accessToken: string,
  tenantId: string
): Promise<AccountBalance[]> {
  // Get the bank summary report which has current balances
  const report = await fetchBankSummary(accessToken, tenantId);
  const balances = parseBankSummaryReport(report);

  // If no balances from report, fall back to fetching accounts directly
  if (balances.length === 0) {
    const accounts = await fetchBankAccounts(accessToken, tenantId);
    // Note: Direct account fetch doesn't include balance, would need separate balance endpoint
    return accounts.map(acc => ({
      accountId: acc.AccountID,
      accountName: acc.Name,
      accountCode: acc.Code,
      accountType: acc.Type as 'BANK' | 'CREDITCARD',
      balance: 0, // Balance not available from accounts endpoint
      currency: acc.CurrencyCode,
    }));
  }

  return balances;
}

/**
 * Verify Xero connection is valid
 */
export async function verifyXeroConnection(
  accessToken: string,
  tenantId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Try to fetch bank accounts as a connectivity test
    await fetchBankAccounts(accessToken, tenantId);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate PKCE code verifier and challenge for OAuth
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  // Generate random bytes for code verifier
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js
    const nodeCrypto = require('crypto');
    const randomBytes = nodeCrypto.randomBytes(32);
    array.set(randomBytes);
  }

  const verifier = base64UrlEncode(array);

  // Generate challenge by hashing verifier with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  // We need to return a promise-based solution or use sync
  // For simplicity, we'll generate challenge server-side
  return { verifier, challenge: '' }; // Challenge computed separately
}

/**
 * Base64 URL encode without padding
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ============================================
// Invoice Types and Functions
// ============================================

export interface XeroInvoiceLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  LineAmount: number;
  AccountCode?: string;
  TaxType?: string;
}

export interface XeroInvoiceContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  FirstName?: string;
  LastName?: string;
}

export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED' | 'DELETED';
  Type: 'ACCREC' | 'ACCPAY';  // ACCREC = Sales invoice (Accounts Receivable)
  Date: string;  // Invoice date (format: /Date(timestamp)/)
  DueDate?: string;
  SubTotal: number;
  TotalTax: number;
  Total: number;
  CurrencyCode: string;
  Contact: XeroInvoiceContact;
  LineItems?: XeroInvoiceLineItem[];
  Reference?: string;
  AmountDue?: number;
  AmountPaid?: number;
  AmountCredited?: number;
  UpdatedDateUTC?: string;
}

export interface FetchInvoicesOptions {
  status?: 'PAID' | 'AUTHORISED' | 'DRAFT' | 'SUBMITTED' | 'VOIDED';  // undefined = all statuses except DELETED
  fromDate?: string;  // YYYY-MM-DD
  toDate?: string;    // YYYY-MM-DD
  page?: number;
}

/**
 * Parse Xero date format to ISO string
 * Xero returns dates as /Date(timestamp+offset)/
 */
export function parseXeroDate(xeroDate: string): string | null {
  if (!xeroDate) return null;

  // Handle /Date(timestamp)/ format
  const match = xeroDate.match(/\/Date\((\d+)([+-]\d+)?\)\//);
  if (match) {
    const timestamp = parseInt(match[1], 10);
    return new Date(timestamp).toISOString().split('T')[0];
  }

  // Handle ISO date format
  if (xeroDate.includes('-')) {
    return xeroDate.split('T')[0];
  }

  return null;
}

/**
 * Fetch invoices from Xero API
 * Filters for ACCREC (sales invoices) by default
 */
export async function fetchInvoices(
  accessToken: string,
  tenantId: string,
  options: FetchInvoicesOptions = {}
): Promise<XeroInvoice[]> {
  const { status, fromDate, toDate, page = 1 } = options;

  // Build where clause - filter for sales invoices (ACCREC)
  const whereParts: string[] = ['Type=="ACCREC"'];

  // Only add status filter if explicitly provided (undefined = all statuses)
  if (status) {
    whereParts.push(`Status=="${status}"`);
  } else {
    // Exclude DELETED and VOIDED when fetching all
    whereParts.push('Status!="DELETED"');
    whereParts.push('Status!="VOIDED"');
  }

  // Note: Xero date filtering uses Date field with DateTime() wrapper
  // Format: DateTime(YYYY,MM,DD) - commas not dashes
  if (fromDate) {
    const [year, month, day] = fromDate.split('-');
    whereParts.push(`Date>=DateTime(${year},${month},${day})`);
  }

  if (toDate) {
    const [year, month, day] = toDate.split('-');
    whereParts.push(`Date<=DateTime(${year},${month},${day})`);
  }

  const whereClause = encodeURIComponent(whereParts.join(' AND '));

  // Build URL with pagination
  const url = `${XERO_API_BASE}/Invoices?where=${whereClause}&order=Date DESC&page=${page}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch invoices: ${errorText}`);
  }

  const data = await response.json();
  return data.Invoices || [];
}

/**
 * Fetch a single invoice with full details (including line items)
 */
export async function fetchInvoiceDetails(
  accessToken: string,
  tenantId: string,
  invoiceId: string
): Promise<XeroInvoice | null> {
  const url = `${XERO_API_BASE}/Invoices/${invoiceId}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    const errorText = await response.text();
    throw new Error(`Failed to fetch invoice details: ${errorText}`);
  }

  const data = await response.json();
  return data.Invoices?.[0] || null;
}
