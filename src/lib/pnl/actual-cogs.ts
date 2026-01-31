// Actual COGS Calculation from BOM and Component Costs
// Replaces the percentage-based COGS estimation with real component costs

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getBaseSku } from '@/lib/inventory/sku-utils';

// ============================================
// Types
// ============================================

export interface LineItem {
  id?: string;
  title: string;
  quantity: number;
  price: number;
  sku?: string;
}

export interface ComponentCostBreakdown {
  componentSku: string;
  componentName: string;
  bomQuantity: number;
  unitCost: number;
  lineCost: number;  // bomQuantity × unitCost
}

export interface ProductCostBreakdown {
  originalSku: string;
  resolvedSku: string;
  quantity: number;
  componentCosts: ComponentCostBreakdown[];
  totalProductCost: number;  // Cost per unit × quantity
  unitCost: number;  // Cost per single unit
}

export interface OrderCOGSResult {
  cogs: number;
  breakdown: ProductCostBreakdown[];
  hasAllData: boolean;
  missingData: string[];
  usedFallback: boolean;
  fallbackAmount: number;
}

// In-memory cache for BOM and component costs (refreshed per API call)
interface BOMEntry {
  product_sku: string;
  component_id: string;
  quantity: number;
}

interface ComponentCost {
  id: string;
  sku: string;
  name: string;
  unit_cost: number | null;
}

interface SKUMapping {
  old_sku: string;
  current_sku: string;
}

// ============================================
// Main COGS Calculation Function
// ============================================

/**
 * Calculate actual COGS for an order using BOM and component costs.
 * Falls back to percentage-based calculation when data is missing.
 *
 * @param lineItems - Array of line items from the order
 * @param revenue - Order revenue (for fallback calculation)
 * @param supabase - Supabase client instance
 * @param fallbackPercentage - Percentage to use when BOM data is missing (default 30%)
 * @returns OrderCOGSResult with breakdown and fallback info
 */
export async function calculateActualCOGS(
  lineItems: LineItem[],
  revenue: number,
  supabase: SupabaseClient,
  fallbackPercentage: number = 0.30
): Promise<OrderCOGSResult> {
  const result: OrderCOGSResult = {
    cogs: 0,
    breakdown: [],
    hasAllData: true,
    missingData: [],
    usedFallback: false,
    fallbackAmount: 0,
  };

  if (!lineItems || lineItems.length === 0) {
    // No line items - use full fallback
    result.cogs = revenue * fallbackPercentage;
    result.hasAllData = false;
    result.usedFallback = true;
    result.fallbackAmount = result.cogs;
    result.missingData.push('No line items in order');
    return result;
  }

  // Load reference data
  const [bomData, componentData, skuMappings] = await Promise.all([
    loadBOMData(supabase),
    loadComponentCosts(supabase),
    loadSKUMappings(supabase),
  ]);

  // Build lookup maps
  const bomBySku = new Map<string, BOMEntry[]>();
  bomData.forEach(entry => {
    const entries = bomBySku.get(entry.product_sku) || [];
    entries.push(entry);
    bomBySku.set(entry.product_sku, entries);
  });

  const componentById = new Map<string, ComponentCost>();
  componentData.forEach(comp => {
    componentById.set(comp.id, comp);
  });

  const skuMappingByOld = new Map<string, string>();
  skuMappings.forEach(m => {
    // Normalize to lowercase for comparison
    skuMappingByOld.set(m.old_sku.toLowerCase(), m.current_sku);
  });

  // Process each line item
  for (const item of lineItems) {
    const originalSku = item.sku || '';
    if (!originalSku) {
      // No SKU - add to fallback
      const fallbackCost = item.price * item.quantity * fallbackPercentage;
      result.fallbackAmount += fallbackCost;
      result.cogs += fallbackCost;
      result.hasAllData = false;
      result.usedFallback = true;
      result.missingData.push(`Missing SKU for item: ${item.title}`);
      continue;
    }

    // Resolve SKU through mappings
    const resolvedSku = resolveSKU(originalSku, skuMappingByOld);

    // Get base SKU for BOM lookup (handles P suffix and variants)
    const baseSku = getBaseSku(resolvedSku);

    // Look up BOM - try exact match first, then base SKU
    let bomEntries = bomBySku.get(resolvedSku);
    if (!bomEntries || bomEntries.length === 0) {
      bomEntries = bomBySku.get(baseSku);
    }
    // Also try uppercase/lowercase variants
    if (!bomEntries || bomEntries.length === 0) {
      bomEntries = bomBySku.get(resolvedSku.toUpperCase());
    }
    if (!bomEntries || bomEntries.length === 0) {
      bomEntries = bomBySku.get(baseSku.toUpperCase());
    }

    if (!bomEntries || bomEntries.length === 0) {
      // No BOM data - use fallback
      const fallbackCost = item.price * item.quantity * fallbackPercentage;
      result.fallbackAmount += fallbackCost;
      result.cogs += fallbackCost;
      result.hasAllData = false;
      result.usedFallback = true;
      result.missingData.push(`No BOM for SKU: ${originalSku} (resolved: ${resolvedSku})`);
      continue;
    }

    // Calculate component costs from BOM
    const productBreakdown: ProductCostBreakdown = {
      originalSku,
      resolvedSku,
      quantity: item.quantity,
      componentCosts: [],
      totalProductCost: 0,
      unitCost: 0,
    };

    let unitCost = 0;
    let hasMissingCosts = false;

    for (const bomEntry of bomEntries) {
      const component = componentById.get(bomEntry.component_id);

      if (!component) {
        result.missingData.push(`Component not found: ${bomEntry.component_id} for SKU: ${originalSku}`);
        hasMissingCosts = true;
        continue;
      }

      if (component.unit_cost === null || component.unit_cost === undefined) {
        result.missingData.push(`No cost for component: ${component.sku} (${component.name})`);
        hasMissingCosts = true;
        continue;
      }

      const lineCost = bomEntry.quantity * component.unit_cost;
      unitCost += lineCost;

      productBreakdown.componentCosts.push({
        componentSku: component.sku,
        componentName: component.name,
        bomQuantity: bomEntry.quantity,
        unitCost: component.unit_cost,
        lineCost,
      });
    }

    if (hasMissingCosts && unitCost === 0) {
      // All component costs missing - use fallback
      const fallbackCost = item.price * item.quantity * fallbackPercentage;
      result.fallbackAmount += fallbackCost;
      result.cogs += fallbackCost;
      result.hasAllData = false;
      result.usedFallback = true;
    } else {
      productBreakdown.unitCost = unitCost;
      productBreakdown.totalProductCost = unitCost * item.quantity;
      result.cogs += productBreakdown.totalProductCost;
      result.breakdown.push(productBreakdown);

      if (hasMissingCosts) {
        result.hasAllData = false;
      }
    }
  }

  return result;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Resolve a SKU through the mapping table to get the current canonical SKU.
 */
function resolveSKU(sku: string, mappings: Map<string, string>): string {
  const normalized = sku.toLowerCase();
  const mapped = mappings.get(normalized);
  return mapped || sku;
}

/**
 * Load all BOM entries from database.
 */
async function loadBOMData(supabase: SupabaseClient): Promise<BOMEntry[]> {
  const { data, error } = await supabase
    .from('bom')
    .select('product_sku, component_id, quantity');

  if (error) {
    console.error('Error loading BOM data:', error);
    return [];
  }

  return data || [];
}

/**
 * Load all components with their costs from preferred suppliers.
 */
async function loadComponentCosts(supabase: SupabaseClient): Promise<ComponentCost[]> {
  // Join components with their preferred supplier costs
  const { data, error } = await supabase
    .from('components')
    .select(`
      id,
      sku,
      name,
      component_suppliers!inner (
        unit_cost,
        is_preferred
      )
    `)
    .eq('is_active', true);

  if (error) {
    console.error('Error loading component costs:', error);
    return [];
  }

  // Extract the preferred supplier cost for each component
  return (data || []).map(comp => {
    // component_suppliers is an array from the join
    const suppliers = comp.component_suppliers as Array<{ unit_cost: number; is_preferred: boolean }>;
    // Find preferred supplier, or take first one
    const preferredSupplier = suppliers.find(s => s.is_preferred) || suppliers[0];

    return {
      id: comp.id,
      sku: comp.sku,
      name: comp.name,
      unit_cost: preferredSupplier?.unit_cost || null,
    };
  });
}

/**
 * Load all SKU mappings (old → current).
 */
async function loadSKUMappings(supabase: SupabaseClient): Promise<SKUMapping[]> {
  const { data, error } = await supabase
    .from('sku_mapping')
    .select('old_sku, current_sku');

  if (error) {
    console.error('Error loading SKU mappings:', error);
    return [];
  }

  return data || [];
}

// ============================================
// Batch COGS Calculation (for P&L refresh)
// ============================================

export interface OrderForCOGS {
  id: string;
  subtotal: number;
  line_items: LineItem[] | null;
  raw_data?: Record<string, unknown> | null;
}

export interface BatchCOGSResult {
  orderCOGS: Map<string, number>;
  totalCOGS: number;
  ordersWithActualCOGS: number;
  ordersWithFallback: number;
  coveragePercentage: number;
}

/**
 * Calculate COGS for a batch of orders.
 * Loads reference data once and processes all orders.
 *
 * @param orders - Array of orders to process
 * @param supabase - Supabase client instance
 * @param fallbackPercentage - Percentage to use when BOM data is missing
 * @returns Batch result with COGS map and statistics
 */
export async function calculateBatchCOGS(
  orders: OrderForCOGS[],
  supabase: SupabaseClient,
  fallbackPercentage: number = 0.30
): Promise<BatchCOGSResult> {
  const result: BatchCOGSResult = {
    orderCOGS: new Map(),
    totalCOGS: 0,
    ordersWithActualCOGS: 0,
    ordersWithFallback: 0,
    coveragePercentage: 0,
  };

  if (orders.length === 0) {
    return result;
  }

  // Load reference data once
  const [bomData, componentData, skuMappings] = await Promise.all([
    loadBOMData(supabase),
    loadComponentCosts(supabase),
    loadSKUMappings(supabase),
  ]);

  // Build lookup maps
  const bomBySku = new Map<string, BOMEntry[]>();
  bomData.forEach(entry => {
    const entries = bomBySku.get(entry.product_sku) || [];
    entries.push(entry);
    bomBySku.set(entry.product_sku, entries);
    // Also store uppercase version
    const upperSku = entry.product_sku.toUpperCase();
    if (upperSku !== entry.product_sku) {
      const upperEntries = bomBySku.get(upperSku) || [];
      upperEntries.push(entry);
      bomBySku.set(upperSku, upperEntries);
    }
  });

  const componentById = new Map<string, ComponentCost>();
  componentData.forEach(comp => {
    componentById.set(comp.id, comp);
  });

  const skuMappingByOld = new Map<string, string>();
  skuMappings.forEach(m => {
    skuMappingByOld.set(m.old_sku.toLowerCase(), m.current_sku);
  });

  // Process each order
  for (const order of orders) {
    // Extract line items - may be in raw_data for some platforms
    let lineItems = order.line_items;

    if (!lineItems || lineItems.length === 0) {
      // Try extracting from raw_data for Shopify
      lineItems = extractLineItemsFromRawData(order.raw_data);
    }

    if (!lineItems || lineItems.length === 0) {
      // No line items - use fallback
      const fallbackCOGS = order.subtotal * fallbackPercentage;
      result.orderCOGS.set(order.id, fallbackCOGS);
      result.totalCOGS += fallbackCOGS;
      result.ordersWithFallback++;
      continue;
    }

    // Calculate COGS for this order's line items
    const orderCOGS = calculateOrderCOGSSync(
      lineItems,
      order.subtotal,
      bomBySku,
      componentById,
      skuMappingByOld,
      fallbackPercentage
    );

    result.orderCOGS.set(order.id, orderCOGS.cogs);
    result.totalCOGS += orderCOGS.cogs;

    if (orderCOGS.usedFallback) {
      result.ordersWithFallback++;
    } else {
      result.ordersWithActualCOGS++;
    }
  }

  result.coveragePercentage = orders.length > 0
    ? (result.ordersWithActualCOGS / orders.length) * 100
    : 0;

  return result;
}

/**
 * Synchronous COGS calculation using pre-loaded reference data.
 */
function calculateOrderCOGSSync(
  lineItems: LineItem[],
  revenue: number,
  bomBySku: Map<string, BOMEntry[]>,
  componentById: Map<string, ComponentCost>,
  skuMappingByOld: Map<string, string>,
  fallbackPercentage: number
): { cogs: number; usedFallback: boolean } {
  let cogs = 0;
  let usedFallback = false;

  for (const item of lineItems) {
    const originalSku = item.sku || '';

    if (!originalSku) {
      cogs += item.price * item.quantity * fallbackPercentage;
      usedFallback = true;
      continue;
    }

    // Resolve SKU through mappings
    const normalized = originalSku.toLowerCase();
    const resolvedSku = skuMappingByOld.get(normalized) || originalSku;
    const baseSku = getBaseSku(resolvedSku);

    // Look up BOM
    let bomEntries = bomBySku.get(resolvedSku)
      || bomBySku.get(baseSku)
      || bomBySku.get(resolvedSku.toUpperCase())
      || bomBySku.get(baseSku.toUpperCase());

    if (!bomEntries || bomEntries.length === 0) {
      cogs += item.price * item.quantity * fallbackPercentage;
      usedFallback = true;
      continue;
    }

    // Calculate component costs
    let unitCost = 0;
    let allCostsFound = true;

    for (const bomEntry of bomEntries) {
      const component = componentById.get(bomEntry.component_id);
      if (!component || component.unit_cost === null) {
        allCostsFound = false;
        continue;
      }
      unitCost += bomEntry.quantity * component.unit_cost;
    }

    if (unitCost > 0) {
      cogs += unitCost * item.quantity;
      if (!allCostsFound) {
        usedFallback = true;
      }
    } else {
      cogs += item.price * item.quantity * fallbackPercentage;
      usedFallback = true;
    }
  }

  return { cogs, usedFallback };
}

/**
 * Extract line items from raw_data (for Shopify GraphQL format).
 */
function extractLineItemsFromRawData(rawData: Record<string, unknown> | null | undefined): LineItem[] {
  if (!rawData) return [];

  // Shopify GraphQL format: lineItems.edges[].node
  const lineItemsData = rawData.lineItems as { edges?: Array<{ node: unknown }> } | undefined;
  if (lineItemsData?.edges) {
    return lineItemsData.edges.map(edge => {
      const node = edge.node as {
        id?: string;
        title?: string;
        quantity?: number;
        sku?: string;
        priceSet?: { shopMoney?: { amount?: string } };
        originalUnitPriceSet?: { shopMoney?: { amount?: string } };
      };

      const price = parseFloat(node.priceSet?.shopMoney?.amount || node.originalUnitPriceSet?.shopMoney?.amount || '0');

      return {
        id: node.id || '',
        title: node.title || '',
        quantity: node.quantity || 1,
        price,
        sku: node.sku || '',
      };
    });
  }

  // Shopify REST format: line_items array
  const restLineItems = rawData.line_items as Array<{
    id?: number;
    title?: string;
    quantity?: number;
    sku?: string;
    price?: string;
  }> | undefined;

  if (Array.isArray(restLineItems)) {
    return restLineItems.map(item => ({
      id: item.id?.toString() || '',
      title: item.title || '',
      quantity: item.quantity || 1,
      price: parseFloat(item.price || '0'),
      sku: item.sku || '',
    }));
  }

  // Etsy format: transactions with products
  const transactions = rawData.transactions as Array<{
    product_id?: string;
    title?: string;
    quantity?: number;
    price?: { amount?: number; divisor?: number };
  }> | undefined;

  if (Array.isArray(transactions)) {
    return transactions.map(txn => {
      // Etsy prices are in smallest currency unit
      const priceAmount = txn.price?.amount || 0;
      const divisor = txn.price?.divisor || 100;
      const price = priceAmount / divisor;

      return {
        id: txn.product_id || '',
        title: txn.title || '',
        quantity: txn.quantity || 1,
        price,
        // Etsy doesn't have SKU directly - would need listing lookup
        sku: '',
      };
    });
  }

  return [];
}

// ============================================
// Cost Statistics Function
// ============================================

export interface COGSStatistics {
  hasData: boolean;
  componentsWithCosts: number;
  componentsWithoutCosts: number;
  productsWithBOM: number;
  skuMappingsCount: number;
  sampleProducts: Array<{
    sku: string;
    unitCost: number;
    componentCount: number;
  }>;
}

/**
 * Get statistics about COGS data coverage.
 */
export async function getCOGSStatistics(supabase: SupabaseClient): Promise<COGSStatistics> {
  const [bomData, componentData, skuMappings] = await Promise.all([
    loadBOMData(supabase),
    loadComponentCosts(supabase),
    loadSKUMappings(supabase),
  ]);

  const componentsWithCosts = componentData.filter(c => c.unit_cost !== null).length;
  const componentsWithoutCosts = componentData.filter(c => c.unit_cost === null).length;

  // Get unique products with BOM
  const productsWithBOM = new Set(bomData.map(b => b.product_sku)).size;

  // Build sample products with their costs
  const componentById = new Map<string, ComponentCost>();
  componentData.forEach(comp => componentById.set(comp.id, comp));

  const bomBySku = new Map<string, BOMEntry[]>();
  bomData.forEach(entry => {
    const entries = bomBySku.get(entry.product_sku) || [];
    entries.push(entry);
    bomBySku.set(entry.product_sku, entries);
  });

  const sampleProducts: COGSStatistics['sampleProducts'] = [];
  let count = 0;
  for (const [sku, entries] of bomBySku) {
    if (count >= 5) break;

    let unitCost = 0;
    for (const entry of entries) {
      const comp = componentById.get(entry.component_id);
      if (comp?.unit_cost) {
        unitCost += entry.quantity * comp.unit_cost;
      }
    }

    if (unitCost > 0) {
      sampleProducts.push({
        sku,
        unitCost,
        componentCount: entries.length,
      });
      count++;
    }
  }

  return {
    hasData: componentsWithCosts > 0 && productsWithBOM > 0,
    componentsWithCosts,
    componentsWithoutCosts,
    productsWithBOM,
    skuMappingsCount: skuMappings.length,
    sampleProducts,
  };
}
