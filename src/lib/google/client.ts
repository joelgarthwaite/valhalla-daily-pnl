/**
 * Google Ads API Client
 * Fetches ad spend data from Google Ads
 */

const GOOGLE_ADS_API_VERSION = 'v18';
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleAdSpendData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

interface GoogleAdsRow {
  segments: {
    date: string;
  };
  metrics: {
    costMicros: string;
    impressions: string;
    clicks: string;
    conversions: number;
    conversionsValue: number;
  };
}

/**
 * Get a fresh access token using the refresh token
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Failed to get access token: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * Fetch daily ad spend from Google Ads
 */
export async function fetchGoogleAdSpend(
  customerId: string,
  accessToken: string,
  developerToken: string,
  startDate: string,
  endDate: string,
  managerId?: string
): Promise<GoogleAdSpendData[]> {
  // GAQL query to get daily spend and conversions
  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date ASC
  `;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  // If using a manager account, add the login-customer-id header
  if (managerId) {
    headers['login-customer-id'] = managerId;
  }

  const url = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:searchStream`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Ads API error:', errorText);
    throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Handle the streaming response format (array of result batches)
  const results: GoogleAdSpendData[] = [];

  if (Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        for (const row of batch.results as GoogleAdsRow[]) {
          results.push({
            date: row.segments.date,
            spend: parseInt(row.metrics.costMicros || '0', 10) / 1_000_000, // Convert micros to currency
            impressions: parseInt(row.metrics.impressions || '0', 10),
            clicks: parseInt(row.metrics.clicks || '0', 10),
            conversions: row.metrics.conversions || 0,
            conversionValue: row.metrics.conversionsValue || 0,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Verify the refresh token is valid
 */
export async function verifyGoogleToken(
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
