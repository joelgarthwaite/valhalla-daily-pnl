/**
 * Meta Marketing API Client
 * Fetches ad spend data from Facebook/Instagram Ads
 */

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaInsight {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
}

export interface MetaInsightsResponse {
  data: MetaInsight[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface MetaAdSpendData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenueAttributed: number;
}

/**
 * Fetch daily ad spend from a Meta ad account
 * @param adAccountId - The ad account ID (e.g., act_123456789)
 * @param accessToken - Meta API access token
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function fetchMetaAdSpend(
  adAccountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdSpendData[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'spend,impressions,clicks,actions,action_values',
    time_range: JSON.stringify({
      since: startDate,
      until: endDate,
    }),
    time_increment: '1', // Daily breakdown
    level: 'account',
  });

  const url = `${META_BASE_URL}/${adAccountId}/insights?${params}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Meta API Error: ${data.error.message}`);
  }

  const insights: MetaInsightsResponse = data;

  return insights.data.map((insight) => {
    // Find purchase conversions (count)
    const purchases = insight.actions?.find(
      (a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
    );

    // Find purchase value (revenue attributed by Meta)
    const purchaseValue = insight.action_values?.find(
      (a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
    );

    return {
      date: insight.date_start,
      spend: parseFloat(insight.spend) || 0,
      impressions: parseInt(insight.impressions || '0', 10),
      clicks: parseInt(insight.clicks || '0', 10),
      conversions: parseInt(purchases?.value || '0', 10),
      revenueAttributed: parseFloat(purchaseValue?.value || '0'),
    };
  });
}

/**
 * Fetch all pages of ad spend data (handles pagination)
 */
export async function fetchAllMetaAdSpend(
  adAccountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdSpendData[]> {
  const allData: MetaAdSpendData[] = [];
  let nextUrl: string | undefined;

  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'spend,impressions,clicks,actions,action_values',
    time_range: JSON.stringify({
      since: startDate,
      until: endDate,
    }),
    time_increment: '1',
    level: 'account',
    limit: '500',
  });

  let url = `${META_BASE_URL}/${adAccountId}/insights?${params}`;

  do {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`);
    }

    const insights: MetaInsightsResponse = data;

    for (const insight of insights.data) {
      // Find purchase conversions (count)
      const purchases = insight.actions?.find(
        (a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );

      // Find purchase value (revenue attributed by Meta)
      const purchaseValue = insight.action_values?.find(
        (a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );

      allData.push({
        date: insight.date_start,
        spend: parseFloat(insight.spend) || 0,
        impressions: parseInt(insight.impressions || '0', 10),
        clicks: parseInt(insight.clicks || '0', 10),
        conversions: parseInt(purchases?.value || '0', 10),
        revenueAttributed: parseFloat(purchaseValue?.value || '0'),
      });
    }

    nextUrl = insights.paging?.next;
    if (nextUrl) {
      url = nextUrl;
    }
  } while (nextUrl);

  return allData;
}

/**
 * Verify the access token is valid
 */
export async function verifyMetaToken(accessToken: string): Promise<{
  valid: boolean;
  expiresAt?: Date;
  error?: string;
}> {
  const url = `${META_BASE_URL}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return { valid: false, error: data.error.message };
    }

    const tokenData = data.data;
    const expiresAt = tokenData.expires_at
      ? new Date(tokenData.expires_at * 1000)
      : undefined;

    return {
      valid: tokenData.is_valid,
      expiresAt,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get token expiration info
 */
export async function getTokenExpiration(accessToken: string): Promise<{
  expiresAt: Date | null;
  isExpired: boolean;
  daysRemaining: number | null;
}> {
  const result = await verifyMetaToken(accessToken);

  if (!result.valid || !result.expiresAt) {
    return {
      expiresAt: null,
      isExpired: true,
      daysRemaining: null,
    };
  }

  const now = new Date();
  const daysRemaining = Math.floor(
    (result.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    expiresAt: result.expiresAt,
    isExpired: daysRemaining <= 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}
