// Country P&L Calculations
// Functions for calculating P&L metrics broken down by country

import {
  DEFAULT_COGS_PERCENTAGE,
  DEFAULT_PICK_PACK_PERCENTAGE,
  DEFAULT_LOGISTICS_PERCENTAGE,
  SHOPIFY_FEE_PERCENTAGE,
  SHOPIFY_FEE_FIXED,
  ETSY_FEE_PERCENTAGE,
  calculateGP1,
  calculateGP2,
  calculateMarginPct,
} from './calculations';

// ============================================
// Country Name Mapping
// ============================================

export const COUNTRY_NAMES: Record<string, string> = {
  // Common markets
  GB: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  IE: 'Ireland',

  // Europe
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  PT: 'Portugal',
  GR: 'Greece',
  CZ: 'Czech Republic',
  HU: 'Hungary',
  RO: 'Romania',
  SK: 'Slovakia',
  SI: 'Slovenia',
  HR: 'Croatia',
  BG: 'Bulgaria',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  CY: 'Cyprus',

  // Asia Pacific
  JP: 'Japan',
  CN: 'China',
  HK: 'Hong Kong',
  SG: 'Singapore',
  KR: 'South Korea',
  TW: 'Taiwan',
  MY: 'Malaysia',
  TH: 'Thailand',
  PH: 'Philippines',
  ID: 'Indonesia',
  VN: 'Vietnam',
  IN: 'India',

  // Middle East
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  IL: 'Israel',
  QA: 'Qatar',
  KW: 'Kuwait',
  BH: 'Bahrain',
  OM: 'Oman',

  // Americas
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',

  // Africa
  ZA: 'South Africa',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',

  // Other
  RU: 'Russia',
  TR: 'Turkey',
  UA: 'Ukraine',
};

// ============================================
// Country Flag Emoji Mapping
// ============================================

export const COUNTRY_FLAGS: Record<string, string> = {
  GB: '🇬🇧',
  US: '🇺🇸',
  CA: '🇨🇦',
  AU: '🇦🇺',
  NZ: '🇳🇿',
  IE: '🇮🇪',
  DE: '🇩🇪',
  FR: '🇫🇷',
  ES: '🇪🇸',
  IT: '🇮🇹',
  NL: '🇳🇱',
  BE: '🇧🇪',
  AT: '🇦🇹',
  CH: '🇨🇭',
  SE: '🇸🇪',
  NO: '🇳🇴',
  DK: '🇩🇰',
  FI: '🇫🇮',
  PL: '🇵🇱',
  PT: '🇵🇹',
  GR: '🇬🇷',
  CZ: '🇨🇿',
  HU: '🇭🇺',
  RO: '🇷🇴',
  SK: '🇸🇰',
  SI: '🇸🇮',
  HR: '🇭🇷',
  BG: '🇧🇬',
  EE: '🇪🇪',
  LV: '🇱🇻',
  LT: '🇱🇹',
  LU: '🇱🇺',
  MT: '🇲🇹',
  CY: '🇨🇾',
  JP: '🇯🇵',
  CN: '🇨🇳',
  HK: '🇭🇰',
  SG: '🇸🇬',
  KR: '🇰🇷',
  TW: '🇹🇼',
  MY: '🇲🇾',
  TH: '🇹🇭',
  PH: '🇵🇭',
  ID: '🇮🇩',
  VN: '🇻🇳',
  IN: '🇮🇳',
  AE: '🇦🇪',
  SA: '🇸🇦',
  IL: '🇮🇱',
  QA: '🇶🇦',
  KW: '🇰🇼',
  BH: '🇧🇭',
  OM: '🇴🇲',
  MX: '🇲🇽',
  BR: '🇧🇷',
  AR: '🇦🇷',
  CL: '🇨🇱',
  CO: '🇨🇴',
  PE: '🇵🇪',
  ZA: '🇿🇦',
  EG: '🇪🇬',
  NG: '🇳🇬',
  KE: '🇰🇪',
  RU: '🇷🇺',
  TR: '🇹🇷',
  UA: '🇺🇦',
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get country name from ISO code
 */
export function getCountryName(countryCode: string | null | undefined): string {
  if (!countryCode) return 'Unknown';
  const code = countryCode.toUpperCase();
  return COUNTRY_NAMES[code] || code;
}

/**
 * Get flag emoji for country code
 */
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return '🏳️';
  const code = countryCode.toUpperCase();
  return COUNTRY_FLAGS[code] || '🏳️';
}

/**
 * Format country display with flag and name
 */
export function formatCountryDisplay(countryCode: string | null | undefined): string {
  const flag = getCountryFlag(countryCode);
  const name = getCountryName(countryCode);
  return `${flag} ${name}`;
}

// ============================================
// Country P&L Types
// ============================================

export interface RawCountryData {
  countryCode: string;
  revenue: number;
  shopifyRevenue: number;
  etsyRevenue: number;
  shopifyOrders: number;
  etsyOrders: number;
  totalOrders: number;
}

export interface CountryPnL {
  countryCode: string;
  countryName: string;
  countryFlag: string;

  // Revenue
  revenue: number;
  shopifyRevenue: number;
  etsyRevenue: number;

  // Orders
  orders: number;
  shopifyOrders: number;
  etsyOrders: number;
  aov: number;

  // Costs
  cogs: number;
  shopifyFees: number;
  etsyFees: number;
  totalPlatformFees: number;
  pickPackCost: number;
  logisticsCost: number;

  // Profit tiers (up to GP2, before ad spend)
  gp1: number;
  gp1Margin: number;
  gp2: number;
  gp2Margin: number;

  // Ad Spend and GP3 (only available if country ad spend data exists)
  adSpend: number | null;
  gp3: number | null;
  gp3Margin: number | null;
  hasAdData: boolean;

  // Percentage of total
  revenueShare: number;
}

export interface CountryAdSpendData {
  countryCode: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenueAttributed: number;
}

export interface CountrySummary {
  totalCountries: number;
  totalRevenue: number;
  totalOrders: number;
  domesticRevenue: number;
  domesticPct: number;
  internationalRevenue: number;
  internationalPct: number;
  topCountryByRevenue: CountryPnL | null;
  topCountryByGP2Margin: CountryPnL | null;
}

// ============================================
// Calculation Functions
// ============================================

/**
 * Calculate P&L metrics for a single country
 */
export function calculateCountryPnL(
  data: RawCountryData,
  totalRevenue: number,
  costConfig?: {
    cogsPct?: number;
    pickPackPct?: number;
    logisticsPct?: number;
  },
  adSpendData?: CountryAdSpendData | null
): CountryPnL {
  const cogsPct = costConfig?.cogsPct ?? DEFAULT_COGS_PERCENTAGE;
  const pickPackPct = costConfig?.pickPackPct ?? DEFAULT_PICK_PACK_PERCENTAGE;
  const logisticsPct = costConfig?.logisticsPct ?? DEFAULT_LOGISTICS_PERCENTAGE;

  // Calculate costs
  const cogs = data.revenue * cogsPct;
  const shopifyFees = (data.shopifyRevenue * SHOPIFY_FEE_PERCENTAGE) + (data.shopifyOrders * SHOPIFY_FEE_FIXED);
  const etsyFees = data.etsyRevenue * ETSY_FEE_PERCENTAGE;
  const totalPlatformFees = shopifyFees + etsyFees;
  const pickPackCost = data.revenue * pickPackPct;
  const logisticsCost = data.revenue * logisticsPct;

  // Calculate profit tiers
  const gp1 = calculateGP1(data.revenue, cogs);
  const gp2 = calculateGP2(gp1, pickPackCost, totalPlatformFees, logisticsCost);

  // Calculate GP3 if ad spend data is available
  const hasAdData = !!adSpendData && adSpendData.spend > 0;
  const adSpend = hasAdData ? adSpendData!.spend : null;
  const gp3 = hasAdData ? gp2 - adSpendData!.spend : null;
  const gp3Margin = hasAdData && data.revenue > 0 ? (gp3! / data.revenue) * 100 : null;

  // Calculate margins
  const gp1Margin = calculateMarginPct(gp1, data.revenue);
  const gp2Margin = calculateMarginPct(gp2, data.revenue);

  // Calculate AOV
  const aov = data.totalOrders > 0 ? data.revenue / data.totalOrders : 0;

  // Calculate revenue share
  const revenueShare = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;

  return {
    countryCode: data.countryCode,
    countryName: getCountryName(data.countryCode),
    countryFlag: getCountryFlag(data.countryCode),
    revenue: data.revenue,
    shopifyRevenue: data.shopifyRevenue,
    etsyRevenue: data.etsyRevenue,
    orders: data.totalOrders,
    shopifyOrders: data.shopifyOrders,
    etsyOrders: data.etsyOrders,
    aov,
    cogs,
    shopifyFees,
    etsyFees,
    totalPlatformFees,
    pickPackCost,
    logisticsCost,
    gp1,
    gp1Margin,
    gp2,
    gp2Margin,
    adSpend,
    gp3,
    gp3Margin,
    hasAdData,
    revenueShare,
  };
}

/**
 * Calculate country P&L for all countries from raw data
 * @param rawData - Aggregated order data by country
 * @param costConfig - Cost configuration percentages
 * @param adSpendByCountry - Map of country code to ad spend data
 */
export function calculateAllCountryPnL(
  rawData: RawCountryData[],
  costConfig?: {
    cogsPct?: number;
    pickPackPct?: number;
    logisticsPct?: number;
  },
  adSpendByCountry?: Map<string, CountryAdSpendData>
): CountryPnL[] {
  // Calculate total revenue first
  const totalRevenue = rawData.reduce((sum, d) => sum + d.revenue, 0);

  // Calculate P&L for each country
  const countryPnLs = rawData.map((data) => {
    const adSpendData = adSpendByCountry?.get(data.countryCode) || null;
    return calculateCountryPnL(data, totalRevenue, costConfig, adSpendData);
  });

  // Sort by revenue descending
  return countryPnLs.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Calculate summary statistics for country data
 * @param countryPnLs - Array of country P&L data
 * @param domesticCountryCode - ISO code for the domestic market (default: 'GB')
 */
export function calculateCountrySummary(
  countryPnLs: CountryPnL[],
  domesticCountryCode: string = 'GB'
): CountrySummary {
  const totalRevenue = countryPnLs.reduce((sum, c) => sum + c.revenue, 0);
  const totalOrders = countryPnLs.reduce((sum, c) => sum + c.orders, 0);

  // Find domestic country
  const domesticCountry = countryPnLs.find(
    (c) => c.countryCode.toUpperCase() === domesticCountryCode.toUpperCase()
  );
  const domesticRevenue = domesticCountry?.revenue || 0;
  const domesticPct = totalRevenue > 0 ? (domesticRevenue / totalRevenue) * 100 : 0;

  const internationalRevenue = totalRevenue - domesticRevenue;
  const internationalPct = 100 - domesticPct;

  // Top country by revenue (already sorted)
  const topCountryByRevenue = countryPnLs.length > 0 ? countryPnLs[0] : null;

  // Top country by GP2 margin (excluding countries with very low revenue)
  const significantCountries = countryPnLs.filter((c) => c.revenue > 100); // Min £100
  const topCountryByGP2Margin = significantCountries.length > 0
    ? significantCountries.reduce((best, c) => (c.gp2Margin > best.gp2Margin ? c : best), significantCountries[0])
    : null;

  return {
    totalCountries: countryPnLs.length,
    totalRevenue,
    totalOrders,
    domesticRevenue,
    domesticPct,
    internationalRevenue,
    internationalPct,
    topCountryByRevenue,
    topCountryByGP2Margin,
  };
}

/**
 * Aggregate order data by country
 * This function processes raw order records and groups them by country
 */
export function aggregateOrdersByCountry(
  orders: Array<{
    platform: 'shopify' | 'etsy';
    subtotal: number;
    shipping_address?: {
      country_code?: string;
    } | null;
  }>
): RawCountryData[] {
  const countryMap = new Map<string, RawCountryData>();

  for (const order of orders) {
    const countryCode = order.shipping_address?.country_code?.toUpperCase() || 'UNKNOWN';

    let countryData = countryMap.get(countryCode);
    if (!countryData) {
      countryData = {
        countryCode,
        revenue: 0,
        shopifyRevenue: 0,
        etsyRevenue: 0,
        shopifyOrders: 0,
        etsyOrders: 0,
        totalOrders: 0,
      };
      countryMap.set(countryCode, countryData);
    }

    const subtotal = Number(order.subtotal) || 0;
    countryData.revenue += subtotal;
    countryData.totalOrders += 1;

    if (order.platform === 'shopify') {
      countryData.shopifyRevenue += subtotal;
      countryData.shopifyOrders += 1;
    } else if (order.platform === 'etsy') {
      countryData.etsyRevenue += subtotal;
      countryData.etsyOrders += 1;
    }
  }

  return Array.from(countryMap.values());
}
