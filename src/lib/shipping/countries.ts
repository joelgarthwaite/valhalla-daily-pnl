// Country and region mappings for shipping analytics

import type { RegionCode, ShippingOrder } from './types';

export interface Region {
  name: string;
  countries: string[];
  color: string;
}

export const REGIONS: Record<RegionCode, Region> = {
  UK: {
    name: 'United Kingdom',
    countries: ['GB'],
    color: '#1E40AF',
  },
  EUROPE: {
    name: 'Europe',
    countries: [
      'DE', 'FR', 'NL', 'ES', 'IT', 'IE', 'BE', 'SE', 'NO', 'DK', 'CH', 'AT',
      'PL', 'PT', 'FI', 'GR', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT',
      'LV', 'EE', 'LU', 'MT', 'CY',
    ],
    color: '#059669',
  },
  NORTH_AMERICA: {
    name: 'North America',
    countries: ['US', 'CA', 'MX'],
    color: '#DC2626',
  },
  APAC: {
    name: 'Asia Pacific',
    countries: [
      'AU', 'NZ', 'JP', 'SG', 'CN', 'HK', 'TW', 'KR', 'IN', 'MY', 'TH', 'ID',
      'PH', 'VN',
    ],
    color: '#7C3AED',
  },
  OTHER: {
    name: 'Other',
    countries: [],
    color: '#6B7280',
  },
};

export const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  ES: 'Spain',
  IT: 'Italy',
  IE: 'Ireland',
  BE: 'Belgium',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  CH: 'Switzerland',
  AT: 'Austria',
  PL: 'Poland',
  PT: 'Portugal',
  FI: 'Finland',
  GR: 'Greece',
  CZ: 'Czech Republic',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  SK: 'Slovakia',
  SI: 'Slovenia',
  LT: 'Lithuania',
  LV: 'Latvia',
  EE: 'Estonia',
  LU: 'Luxembourg',
  MT: 'Malta',
  CY: 'Cyprus',
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  SG: 'Singapore',
  CN: 'China',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  KR: 'South Korea',
  IN: 'India',
  MY: 'Malaysia',
  TH: 'Thailand',
  ID: 'Indonesia',
  PH: 'Philippines',
  VN: 'Vietnam',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  IL: 'Israel',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  ZA: 'South Africa',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',
};

export const REGION_ORDER: RegionCode[] = ['UK', 'EUROPE', 'NORTH_AMERICA', 'APAC', 'OTHER'];

export function getRegionForCountry(countryCode: string): RegionCode {
  const code = countryCode?.toUpperCase();
  if (!code) return 'OTHER';

  for (const [regionCode, region] of Object.entries(REGIONS) as [RegionCode, Region][]) {
    if (region.countries.includes(code)) {
      return regionCode;
    }
  }
  return 'OTHER';
}

export function getCountryName(countryCode: string): string {
  const code = countryCode?.toUpperCase();
  return COUNTRY_NAMES[code] || code || 'Unknown';
}

export function getCountryCode(order: ShippingOrder): string {
  if (order.shipping_address?.country_code) {
    return order.shipping_address.country_code.toUpperCase();
  }

  const rawData = order.raw_data as Record<string, unknown> | null;
  if (rawData?.country_iso && typeof rawData.country_iso === 'string') {
    return rawData.country_iso.toUpperCase();
  }

  return 'GB';
}

export function getRegionColor(countryCode: string): string {
  const region = getRegionForCountry(countryCode);
  return REGIONS[region].color;
}

export function getCountriesInRegion(regionCode: RegionCode): string[] {
  return REGIONS[regionCode]?.countries || [];
}
