// Carrier-specific templates and tracking number patterns

export interface CarrierTemplate {
  name: string;
  code: 'dhl' | 'royalmail';
  trackingPatterns: RegExp[];
  commonHeaders: {
    tracking: string[];
    cost: string[];
    date: string[];
    service: string[];
    weight: string[];
    currency: string[];
  };
}

export const DHL_TEMPLATE: CarrierTemplate = {
  name: 'DHL Express',
  code: 'dhl',
  trackingPatterns: [
    /^\d{10,11}$/, // Standard DHL tracking: 10-11 digits
    /^JD\d{18}$/, // JD prefix format
  ],
  commonHeaders: {
    tracking: ['AWB', 'Waybill', 'Tracking', 'Shipment ID', 'Reference', 'AWB Number'],
    cost: ['Total Charge', 'Net Amount', 'Charge', 'Cost', 'Amount', 'Net'],
    date: ['Ship Date', 'Pickup Date', 'Date', 'Shipping Date'],
    service: ['Service', 'Product', 'Service Type', 'Service Code'],
    weight: ['Weight', 'Actual Weight', 'Charged Weight', 'Weight (KG)'],
    currency: ['Currency', 'Curr', 'Currency Code'],
  },
};

export const ROYALMAIL_TEMPLATE: CarrierTemplate = {
  name: 'Royal Mail',
  code: 'royalmail',
  trackingPatterns: [
    /^[A-Z]{2}\d{9}[A-Z]{2}$/, // Standard Royal Mail: 2 letters + 9 digits + 2 letters
    /^[A-Z]{2}\d{9}GB$/, // GB suffix variant
  ],
  commonHeaders: {
    tracking: ['Barcode', 'Tracking', 'Item ID', 'Reference', 'Tracking Number'],
    cost: ['Postage', 'Cost', 'Amount', 'Price', 'Charge'],
    date: ['Date', 'Post Date', 'Despatch Date', 'Ship Date'],
    service: ['Service', 'Product', 'Service Name', 'Mail Class'],
    weight: ['Weight', 'Weight (g)', 'Weight (kg)', 'Actual Weight'],
    currency: ['Currency'],
  },
};

export const CARRIER_TEMPLATES: Record<string, CarrierTemplate> = {
  dhl: DHL_TEMPLATE,
  royalmail: ROYALMAIL_TEMPLATE,
};

/**
 * Normalize a tracking number by removing spaces and converting to uppercase
 */
export function normalizeTrackingNumber(tracking: string): string {
  return tracking.replace(/\s+/g, '').toUpperCase();
}

/**
 * Detect carrier from tracking number pattern
 */
export function detectCarrierFromTracking(
  tracking: string
): 'dhl' | 'royalmail' | null {
  const normalized = normalizeTrackingNumber(tracking);

  for (const pattern of DHL_TEMPLATE.trackingPatterns) {
    if (pattern.test(normalized)) {
      return 'dhl';
    }
  }

  for (const pattern of ROYALMAIL_TEMPLATE.trackingPatterns) {
    if (pattern.test(normalized)) {
      return 'royalmail';
    }
  }

  return null;
}

/**
 * Validate tracking number format for a specific carrier
 */
export function validateTrackingForCarrier(
  tracking: string,
  carrier: 'dhl' | 'royalmail'
): boolean {
  const normalized = normalizeTrackingNumber(tracking);
  const template = CARRIER_TEMPLATES[carrier];

  for (const pattern of template.trackingPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}
