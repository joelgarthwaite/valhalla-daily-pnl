/**
 * Microsoft Advertising (Bing Ads) API Client
 * Fetches ad spend data from Microsoft Advertising
 *
 * API Docs: https://learn.microsoft.com/en-us/advertising/guides/get-started
 */

const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const MS_REPORTING_URL = 'https://reporting.api.bingads.microsoft.com/Reporting/v13/GenerateReport';

export interface MicrosoftAdSpendData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

/**
 * Get the OAuth authorization URL for Microsoft Advertising
 * User visits this URL to authorize the app
 */
export function getAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state?: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'https://ads.microsoft.com/msads.manage offline_access',
    state: state || '',
  });

  return `${MS_AUTH_URL}/authorize?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch(`${MS_AUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`OAuth error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Get a fresh access token using the refresh token
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; newRefreshToken?: string }> {
  const response = await fetch(`${MS_AUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://ads.microsoft.com/msads.manage offline_access',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Failed to refresh token: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    // Microsoft may return a new refresh token
    newRefreshToken: data.refresh_token,
  };
}

/**
 * Fetch account performance report from Microsoft Advertising
 * Uses the Reporting API to get daily ad spend data
 */
export async function fetchMicrosoftAdSpend(
  accountId: string,
  accessToken: string,
  developerToken: string,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<MicrosoftAdSpendData[]> {
  // Microsoft Advertising uses SOAP API for reporting
  // We'll use the REST-like Reporting API endpoint

  // First, submit a report request
  const reportRequestBody = {
    ReportRequest: {
      ExcludeColumnHeaders: false,
      ExcludeReportFooter: true,
      ExcludeReportHeader: true,
      Format: 'Csv',
      ReturnOnlyCompleteData: false,
      Type: 'AccountPerformanceReportRequest',
      Aggregation: 'Daily',
      Columns: [
        'TimePeriod',
        'Spend',
        'Impressions',
        'Clicks',
        'Conversions',
        'Revenue',
      ],
      Scope: {
        AccountIds: [accountId],
      },
      Time: {
        CustomDateRangeStart: {
          Day: parseInt(startDate.split('-')[2]),
          Month: parseInt(startDate.split('-')[1]),
          Year: parseInt(startDate.split('-')[0]),
        },
        CustomDateRangeEnd: {
          Day: parseInt(endDate.split('-')[2]),
          Month: parseInt(endDate.split('-')[1]),
          Year: parseInt(endDate.split('-')[0]),
        },
      },
    },
  };

  const submitResponse = await fetch(`${MS_REPORTING_URL}/Submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'DeveloperToken': developerToken,
      'CustomerId': customerId,
      'CustomerAccountId': accountId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportRequestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`Microsoft Ads API error: ${submitResponse.status} - ${errorText}`);
  }

  const submitData = await submitResponse.json();
  const reportRequestId = submitData.ReportRequestId;

  if (!reportRequestId) {
    throw new Error('No ReportRequestId returned from Microsoft Ads API');
  }

  // Poll for report completion
  let reportStatus = 'Pending';
  let reportDownloadUrl = '';
  let attempts = 0;
  const maxAttempts = 30;

  while (reportStatus === 'Pending' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const pollResponse = await fetch(`${MS_REPORTING_URL}/Poll`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'DeveloperToken': developerToken,
        'CustomerId': customerId,
        'CustomerAccountId': accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ReportRequestId: reportRequestId }),
    });

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      throw new Error(`Report poll error: ${pollResponse.status} - ${errorText}`);
    }

    const pollData = await pollResponse.json();
    reportStatus = pollData.ReportRequestStatus?.Status || 'Error';
    reportDownloadUrl = pollData.ReportRequestStatus?.ReportDownloadUrl || '';
    attempts++;
  }

  if (reportStatus !== 'Success' || !reportDownloadUrl) {
    throw new Error(`Report generation failed with status: ${reportStatus}`);
  }

  // Download and parse the report
  // Microsoft returns reports as ZIP files, need to decompress
  const reportResponse = await fetch(reportDownloadUrl);
  const arrayBuffer = await reportResponse.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Check if it's a ZIP file (starts with PK)
  const isZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;

  let csvContent: string;
  if (isZip) {
    // Use pako to decompress
    const pako = await import('pako');
    try {
      // ZIP files have local file headers
      // Skip to the actual deflated data (after the local file header)
      // Local file header: 4 (signature) + 26 (fixed) + fileNameLen + extraFieldLen
      const fileNameLen = uint8Array[26] + (uint8Array[27] << 8);
      const extraFieldLen = uint8Array[28] + (uint8Array[29] << 8);
      const dataStart = 30 + fileNameLen + extraFieldLen;

      // Find the compressed size from the header (bytes 18-21)
      const compressedSize = uint8Array[18] + (uint8Array[19] << 8) +
                             (uint8Array[20] << 16) + (uint8Array[21] << 24);

      const compressedData = uint8Array.slice(dataStart, dataStart + compressedSize);

      // Use inflateRaw for raw DEFLATE data (ZIP uses raw DEFLATE)
      const decompressed = pako.inflateRaw(compressedData);
      csvContent = new TextDecoder().decode(decompressed);
    } catch {
      // If pako fails, try reading as text (might not be compressed)
      csvContent = new TextDecoder().decode(uint8Array);
    }
  } else {
    csvContent = new TextDecoder().decode(uint8Array);
  }

  return parseMicrosoftReportCsv(csvContent);
}

/**
 * Parse Microsoft Advertising CSV report into structured data
 */
function parseMicrosoftReportCsv(csvContent: string): MicrosoftAdSpendData[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const results: MicrosoftAdSpendData[] = [];

  // Find column indexes
  const dateIdx = headers.findIndex(h => h === 'TimePeriod' || h === 'GregorianDate');
  const spendIdx = headers.findIndex(h => h === 'Spend');
  const impressionsIdx = headers.findIndex(h => h === 'Impressions');
  const clicksIdx = headers.findIndex(h => h === 'Clicks');
  const conversionsIdx = headers.findIndex(h => h === 'Conversions');
  const revenueIdx = headers.findIndex(h => h === 'Revenue');

  // If we can't find the date column, the format is unexpected
  if (dateIdx === -1) {
    console.error('Microsoft Report - Unexpected CSV format. Headers:', headers);
    console.error('Microsoft Report - First 500 chars:', csvContent.substring(0, 500));
    return [];
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length < headers.length) continue;

    const dateValue = values[dateIdx];
    if (!dateValue) continue;

    // Microsoft formats dates as MM/DD/YYYY, convert to YYYY-MM-DD
    const dateParts = dateValue.split('/');
    const formattedDate = dateParts.length === 3
      ? `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
      : dateValue;

    results.push({
      date: formattedDate,
      spend: spendIdx >= 0 ? parseFloat(values[spendIdx]) || 0 : 0,
      impressions: impressionsIdx >= 0 ? parseInt(values[impressionsIdx]) || 0 : 0,
      clicks: clicksIdx >= 0 ? parseInt(values[clicksIdx]) || 0 : 0,
      conversions: conversionsIdx >= 0 ? parseFloat(values[conversionsIdx]) || 0 : 0,
      conversionValue: revenueIdx >= 0 ? parseFloat(values[revenueIdx]) || 0 : 0,
    });
  }

  return results;
}

/**
 * Verify the refresh token is valid
 */
export async function verifyMicrosoftToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    await getAccessToken(clientId, clientSecret, refreshToken);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get accounts for the authenticated user
 * Useful for initial setup to find account IDs
 */
export async function getAccounts(
  accessToken: string,
  developerToken: string,
  customerId: string
): Promise<Array<{ id: string; name: string; number: string }>> {
  const response = await fetch('https://clientcenter.api.bingads.microsoft.com/CustomerManagement/v13/Accounts/GetAccountsByUser', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'DeveloperToken': developerToken,
      'CustomerId': customerId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Get accounts error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const accounts = data.Accounts || [];

  return accounts.map((account: { Id: string; Name: string; Number: string }) => ({
    id: account.Id,
    name: account.Name,
    number: account.Number,
  }));
}
