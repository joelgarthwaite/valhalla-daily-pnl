/**
 * ShipStation API Client
 *
 * Fetches shipment data from ShipStation and syncs to our database.
 */

const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY || '';
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET || '';
const SHIPSTATION_BASE_URL = 'https://ssapi.shipstation.com';

export interface ShipStationShipment {
  shipmentId: number;
  orderId: number;
  orderNumber: string;
  trackingNumber: string;
  carrierCode: string;
  serviceCode: string;
  shipDate: string;
  shipmentCost: number;
  weight: {
    value: number;
    units: string;
  } | null;
  voided: boolean;
}

export interface ShipStationResponse {
  shipments: ShipStationShipment[];
  total: number;
  page: number;
  pages: number;
}

function getAuthHeader(): string {
  const credentials = `${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export async function fetchShipStationShipments(options: {
  startDate?: string;
  endDate?: string;
  carrierCode?: string;
  pageSize?: number;
  maxPages?: number;
}): Promise<ShipStationShipment[]> {
  const { startDate, endDate, carrierCode, pageSize = 500, maxPages = 100 } = options;

  if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
    throw new Error('ShipStation API credentials not configured');
  }

  const shipments: ShipStationShipment[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      page: page.toString(),
    });

    if (startDate) params.set('shipDateStart', startDate);
    if (endDate) params.set('shipDateEnd', endDate);
    if (carrierCode) params.set('carrierCode', carrierCode);

    const url = `${SHIPSTATION_BASE_URL}/shipments?${params}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
    }

    const data: ShipStationResponse = await response.json();
    shipments.push(...data.shipments);
    totalPages = data.pages;

    // Rate limiting - ShipStation allows 40 requests per minute
    if (page < totalPages && page < maxPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    page++;
  }

  // Filter out voided shipments
  return shipments.filter(s => !s.voided);
}

export function mapCarrierCode(shipstationCarrier: string): string {
  const mapping: Record<string, string> = {
    'royal_mail': 'royalmail',
    'dhl_express_uk': 'dhl',
    'dhl_express': 'dhl',
    'deutsche_post_cross_border': 'deutschepost',
  };
  return mapping[shipstationCarrier] || shipstationCarrier;
}

export function parseWeight(weight: ShipStationShipment['weight']): number | null {
  if (!weight?.value) return null;

  // Convert to kg based on units
  switch (weight.units?.toLowerCase()) {
    case 'grams':
      return weight.value / 1000;
    case 'ounces':
      return weight.value * 0.0283495;
    case 'pounds':
      return weight.value * 0.453592;
    default:
      return weight.value; // Assume kg
  }
}
