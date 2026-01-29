/**
 * SKU Utility Functions
 *
 * Business Rules:
 * 1. P suffix = personalized/engraved, uses SAME stock/BOM as base SKU
 *    Example: VANTAGE and VANTAGEP share the same components
 *
 * 2. -BALL suffix = includes golf ball, DIFFERENT BOM but group for sales display
 *    Example: VANTAGE and VANTAGE-BALL have different components
 *
 * 3. Numeric differences = DIFFERENT products entirely
 *    Example: RS vs RS2 (Ring Stand vs Double Ring Stand)
 *    Example: COINSLAB-40 vs COINSLAB-45 (different sizes in mm)
 *
 * IMPORTANT: This file must remain standalone with NO imports from other
 * inventory files to avoid circular dependencies.
 */

// Suffixes that indicate same BOM/stock (auto-link for inventory)
export const VARIANT_SUFFIXES = ['P'] as const;

// Suffixes that indicate different BOM but should group for sales analysis
export const DISPLAY_GROUP_SUFFIXES = ['-BALL'] as const;

/**
 * Get the base SKU for BOM/inventory purposes.
 * Strips P suffix for personalized variants.
 *
 * Examples:
 * - VANTAGEP -> VANTAGE (same stock)
 * - RSP -> RS (same stock)
 * - VANTAGE-BALL -> VANTAGE-BALL (different stock, not stripped)
 */
export function getBaseSku(sku: string): string {
  if (!sku) return sku;
  const upperSku = sku.toUpperCase().trim();

  for (const suffix of VARIANT_SUFFIXES) {
    if (upperSku.endsWith(suffix) && upperSku.length > suffix.length) {
      return upperSku.slice(0, -suffix.length);
    }
  }

  return upperSku;
}

/**
 * Get the display group base for sales analysis.
 * Strips -BALL suffix for grouping in sales views.
 *
 * Examples:
 * - VANTAGE-BALL -> VANTAGE (grouped for sales)
 * - VANTAGEP -> VANTAGE (also strips P)
 */
export function getDisplayGroupBase(sku: string): string {
  if (!sku) return sku;
  let result = sku.toUpperCase().trim();

  // First strip display group suffixes
  for (const suffix of DISPLAY_GROUP_SUFFIXES) {
    if (result.endsWith(suffix) && result.length > suffix.length) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }

  // Then strip variant suffixes (P)
  for (const suffix of VARIANT_SUFFIXES) {
    if (result.endsWith(suffix) && result.length > suffix.length) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }

  return result;
}

/**
 * Check if a SKU is a variant (has P suffix).
 */
export function isVariantSku(sku: string): boolean {
  if (!sku) return false;
  const upperSku = sku.toUpperCase().trim();

  return VARIANT_SUFFIXES.some(
    suffix => upperSku.endsWith(suffix) && upperSku.length > suffix.length
  );
}

/**
 * Check if a SKU has a display group suffix (-BALL).
 */
export function hasDisplayGroupSuffix(sku: string): boolean {
  if (!sku) return false;
  const upperSku = sku.toUpperCase().trim();

  return DISPLAY_GROUP_SUFFIXES.some(
    suffix => upperSku.endsWith(suffix) && upperSku.length > suffix.length
  );
}

/**
 * Check if two SKUs are variants of each other (share same BOM).
 * Only returns true for P-suffix relationships.
 *
 * Examples:
 * - areSkuVariants('VANTAGE', 'VANTAGEP') -> true
 * - areSkuVariants('RS', 'RS2') -> false (different products)
 * - areSkuVariants('VANTAGE', 'VANTAGE-BALL') -> false (different BOM)
 */
export function areSkuVariants(sku1: string, sku2: string): boolean {
  if (!sku1 || !sku2) return false;

  const base1 = getBaseSku(sku1);
  const base2 = getBaseSku(sku2);

  // Must have same base and at least one must be a variant
  return base1 === base2 && (isVariantSku(sku1) || isVariantSku(sku2));
}

/**
 * Check if two SKUs should be grouped for sales display.
 * Includes both P-suffix and -BALL suffix relationships.
 */
export function areInSameDisplayGroup(sku1: string, sku2: string): boolean {
  if (!sku1 || !sku2) return false;

  const displayBase1 = getDisplayGroupBase(sku1);
  const displayBase2 = getDisplayGroupBase(sku2);

  return displayBase1 === displayBase2;
}

/**
 * Check if a SKU is a -BALL variant (includes golf ball).
 * These have different BOM but are grouped for display.
 */
export function isBallVariant(sku: string): boolean {
  if (!sku) return false;
  const upperSku = sku.toUpperCase().trim();

  return DISPLAY_GROUP_SUFFIXES.some(
    suffix => upperSku.endsWith(suffix) && upperSku.length > suffix.length
  );
}

/**
 * Check if a SKU is any type of variant (P or -BALL).
 */
export function isAnyVariant(sku: string): boolean {
  return isVariantSku(sku) || isBallVariant(sku);
}
