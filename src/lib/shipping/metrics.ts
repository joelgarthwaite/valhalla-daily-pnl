// Shipping metrics calculations

import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import type {
  ShippingOrder,
  Shipment,
  ShippingKPIData,
  ShippingTrendData,
  CarrierBreakdownData,
  CountryBreakdownData,
  PlatformByRegionData,
  ShippingOrderWithShipment,
  DateRange,
  CountryFilter,
  CountryOption,
  RegionCode,
} from './types';
import {
  getCountryCode,
  getCountryName,
  getRegionForCountry,
  REGIONS,
  REGION_ORDER,
} from './countries';

/**
 * Get shipments that match the given orders by order_id.
 * This is the correct way to match shipments - by their linked order, not by shipping_date.
 */
export function getShipmentsForOrders(
  orders: ShippingOrder[],
  allShipments: Shipment[]
): Shipment[] {
  const orderIds = new Set(orders.map((o) => o.id));
  return allShipments.filter((s) => s.order_id && orderIds.has(s.order_id));
}

export function calculateShippingKPIs(
  currentOrders: ShippingOrder[],
  allShipments: Shipment[],
  previousOrders: ShippingOrder[]
): ShippingKPIData {
  // Match shipments to orders by order_id (not by shipping_date)
  const currentShipments = getShipmentsForOrders(currentOrders, allShipments);
  const previousShipments = getShipmentsForOrders(previousOrders, allShipments);

  const currentShippingRevenue = currentOrders.reduce(
    (sum, order) => sum + Number(order.shipping_charged || 0),
    0
  );
  const previousShippingRevenue = previousOrders.reduce(
    (sum, order) => sum + Number(order.shipping_charged || 0),
    0
  );

  const currentShippingExpenditure = currentShipments.reduce(
    (sum, shipment) => sum + Number(shipment.shipping_cost || 0),
    0
  );
  const previousShippingExpenditure = previousShipments.reduce(
    (sum, shipment) => sum + Number(shipment.shipping_cost || 0),
    0
  );

  const currentShippingMargin = currentShippingRevenue - currentShippingExpenditure;
  const previousShippingMargin = previousShippingRevenue - previousShippingExpenditure;

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    shippingRevenue: currentShippingRevenue,
    shippingRevenueChange: calculateChange(currentShippingRevenue, previousShippingRevenue),
    shippingExpenditure: currentShippingExpenditure,
    shippingExpenditureChange: calculateChange(currentShippingExpenditure, previousShippingExpenditure),
    shippingMargin: currentShippingMargin,
    shippingMarginChange: calculateChange(currentShippingMargin, previousShippingMargin),
    orderCount: currentOrders.length,
    orderCountChange: calculateChange(currentOrders.length, previousOrders.length),
  };
}

export function calculateShippingTrend(
  orders: ShippingOrder[],
  allShipments: Shipment[],
  dateRange: DateRange
): ShippingTrendData[] {
  const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

  // Create a map of order_id -> shipment for quick lookup
  const shipmentsByOrderId = new Map<string, Shipment>();
  allShipments.forEach((shipment) => {
    if (shipment.order_id) {
      shipmentsByOrderId.set(shipment.order_id, shipment);
    }
  });

  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayOrders = orders.filter((order) => {
      const orderDate = startOfDay(new Date(order.order_date));
      return orderDate.getTime() === dayStart.getTime();
    });

    const shippingRevenue = dayOrders.reduce(
      (sum, order) => sum + Number(order.shipping_charged || 0),
      0
    );

    // Match shipments by order_id (not by shipping_date)
    const shippingExpenditure = dayOrders.reduce((sum, order) => {
      const shipment = shipmentsByOrderId.get(order.id);
      return sum + (shipment ? Number(shipment.shipping_cost) : 0);
    }, 0);

    return {
      date: format(day, 'yyyy-MM-dd'),
      shippingRevenue,
      shippingExpenditure,
      shippingMargin: shippingRevenue - shippingExpenditure,
    };
  });
}

export function calculateCarrierBreakdown(
  orders: ShippingOrder[],
  allShipments: Shipment[]
): CarrierBreakdownData[] {
  // Match shipments to orders in the date range
  const matchedShipments = getShipmentsForOrders(orders, allShipments);

  const carrierTotals = new Map<string, { cost: number; count: number }>();

  matchedShipments.forEach((shipment) => {
    const existing = carrierTotals.get(shipment.carrier) || { cost: 0, count: 0 };
    carrierTotals.set(shipment.carrier, {
      cost: existing.cost + Number(shipment.shipping_cost),
      count: existing.count + 1,
    });
  });

  const totalCost = Array.from(carrierTotals.values()).reduce(
    (sum, { cost }) => sum + cost,
    0
  );

  return Array.from(carrierTotals.entries())
    .map(([carrier, { cost, count }]) => ({
      carrier,
      cost,
      percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      shipmentCount: count,
    }))
    .sort((a, b) => b.cost - a.cost);
}

export function mergeOrdersWithShipments(
  orders: ShippingOrder[],
  shipments: Shipment[],
  brands: Array<{ id: string; name: string; code: string }>
): ShippingOrderWithShipment[] {
  const shipmentsByOrderId = new Map<string, Shipment>();
  shipments.forEach((shipment) => {
    if (shipment.order_id) {
      shipmentsByOrderId.set(shipment.order_id, shipment);
    }
  });

  const brandsById = new Map<string, { id: string; name: string; code: string }>();
  brands.forEach((brand) => {
    brandsById.set(brand.id, brand);
  });

  return orders.map((order) => ({
    ...order,
    shipment: shipmentsByOrderId.get(order.id),
    brand: brandsById.get(order.brand_id),
  }));
}

export function filterByBrand<T extends { brand_id: string }>(
  items: T[],
  brandCode: string | null,
  brands: Array<{ id: string; code: string }>
): T[] {
  if (!brandCode || brandCode === 'all') return items;

  const brand = brands.find((b) => b.code === brandCode);
  if (!brand) return items;

  return items.filter((item) => item.brand_id === brand.id);
}

export function filterByDateRange<T extends { order_date?: string; shipping_date?: string }>(
  items: T[],
  dateRange: DateRange
): T[] {
  const from = startOfDay(dateRange.from).getTime();
  const to = startOfDay(dateRange.to).getTime() + 24 * 60 * 60 * 1000 - 1;

  return items.filter((item) => {
    const dateStr = item.order_date || item.shipping_date;
    if (!dateStr) return false;
    const date = new Date(dateStr).getTime();
    return date >= from && date <= to;
  });
}

export function filterByCountry<T extends ShippingOrder>(
  items: T[],
  countryFilter: CountryFilter
): T[] {
  if (countryFilter.countries.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const countryCode = getCountryCode(item);
    return countryFilter.countries.includes(countryCode);
  });
}

export function getUniqueCountries(orders: ShippingOrder[]): CountryOption[] {
  const countryMap = new Map<string, { count: number; name: string; region: RegionCode }>();

  orders.forEach((order) => {
    const code = getCountryCode(order);
    const existing = countryMap.get(code);
    if (existing) {
      existing.count++;
    } else {
      countryMap.set(code, {
        count: 1,
        name: getCountryName(code),
        region: getRegionForCountry(code),
      });
    }
  });

  return Array.from(countryMap.entries())
    .map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
      region: data.region,
    }))
    .sort((a, b) => b.count - a.count);
}

export function calculateCountryBreakdown(
  orders: ShippingOrder[],
  shipments: Shipment[]
): CountryBreakdownData[] {
  const shipmentsByOrderId = new Map<string, Shipment>();
  shipments.forEach((shipment) => {
    if (shipment.order_id) {
      shipmentsByOrderId.set(shipment.order_id, shipment);
    }
  });

  const countryMap = new Map<string, {
    orderCount: number;
    shippingRevenue: number;
    shippingCost: number;
  }>();

  orders.forEach((order) => {
    const code = getCountryCode(order);
    const shipment = shipmentsByOrderId.get(order.id);
    const shippingRevenue = Number(order.shipping_charged || 0);
    const shippingCost = shipment ? Number(shipment.shipping_cost || 0) : 0;

    const existing = countryMap.get(code);
    if (existing) {
      existing.orderCount++;
      existing.shippingRevenue += shippingRevenue;
      existing.shippingCost += shippingCost;
    } else {
      countryMap.set(code, {
        orderCount: 1,
        shippingRevenue,
        shippingCost,
      });
    }
  });

  const totalOrders = orders.length;

  return Array.from(countryMap.entries())
    .map(([code, data]) => ({
      countryCode: code,
      countryName: getCountryName(code),
      region: getRegionForCountry(code),
      orderCount: data.orderCount,
      orderPercentage: totalOrders > 0 ? (data.orderCount / totalOrders) * 100 : 0,
      shippingRevenue: data.shippingRevenue,
      shippingCost: data.shippingCost,
      shippingMargin: data.shippingRevenue - data.shippingCost,
    }))
    .sort((a, b) => b.orderCount - a.orderCount);
}

export function calculatePlatformByRegion(orders: ShippingOrder[]): PlatformByRegionData[] {
  const regionMap = new Map<RegionCode, {
    shopify: { count: number; revenue: number };
    etsy: { count: number; revenue: number };
  }>();

  REGION_ORDER.forEach((region) => {
    regionMap.set(region, {
      shopify: { count: 0, revenue: 0 },
      etsy: { count: 0, revenue: 0 },
    });
  });

  orders.forEach((order) => {
    const code = getCountryCode(order);
    const region = getRegionForCountry(code);
    const data = regionMap.get(region)!;
    const revenue = Number(order.total || 0);

    if (order.platform === 'shopify') {
      data.shopify.count++;
      data.shopify.revenue += revenue;
    } else if (order.platform === 'etsy') {
      data.etsy.count++;
      data.etsy.revenue += revenue;
    }
  });

  return REGION_ORDER
    .map((regionCode) => {
      const data = regionMap.get(regionCode)!;
      const totalOrders = data.shopify.count + data.etsy.count;
      const shopifyPercentage = totalOrders > 0 ? (data.shopify.count / totalOrders) * 100 : 0;
      const etsyPercentage = totalOrders > 0 ? (data.etsy.count / totalOrders) * 100 : 0;

      return {
        region: regionCode,
        regionName: REGIONS[regionCode].name,
        shopify: {
          orderCount: data.shopify.count,
          orderPercentage: shopifyPercentage,
          revenue: data.shopify.revenue,
        },
        etsy: {
          orderCount: data.etsy.count,
          orderPercentage: etsyPercentage,
          revenue: data.etsy.revenue,
        },
        totalOrders,
      };
    })
    .filter((r) => r.totalOrders > 0);
}
