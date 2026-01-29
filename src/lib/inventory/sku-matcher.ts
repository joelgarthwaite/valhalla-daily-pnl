/**
 * SKU Matching & Suggestion Engine
 *
 * IMPORTANT: This file must remain STANDALONE with NO imports from other
 * inventory files to avoid circular dependencies that can crash the site.
 *
 * Business Rules:
 * 1. P suffix = same product (auto-link) - HIGH confidence
 * 2. -BALL suffix = different BOM but related - MEDIUM confidence
 * 3. Numeric differences = DIFFERENT products - REJECT
 *    - RS vs RS2 (Ring Stand vs Double Ring Stand)
 *    - COINSLAB-40 vs COINSLAB-45 (different sizes)
 * 4. Category prefixes = DIFFERENT products - REJECT
 *    - GBC vs TBC vs BBC (Golf vs Tennis vs Baseball)
 * 5. Material evolution: AFZ → MAH → AHW (all equivalent, can map)
 * 6. Legacy product lines: PTB→VANTAGE, 02/GBB02→ICON
 */

// Duplicate the suffix constants here to avoid imports
const VARIANT_SUFFIXES = ['P'] as const;
const DISPLAY_GROUP_SUFFIXES = ['-BALL'] as const;

// Category prefix patterns - codes that end with these suffixes indicate product category
const CATEGORY_SUFFIX_PATTERNS = ['BC', 'DC', 'DS'] as const;

// Known category prefixes (manually defined for accuracy)
// This is more reliable than pattern detection for known products
const KNOWN_CATEGORY_PREFIXES = [
  // Ball Cases (BC suffix)
  'GBC',   // Golf Ball Case
  'TBC',   // Tennis Ball Case
  'CBC',   // Cricket Ball Case
  'BBC',   // Baseball Ball Case
  'SBC',   // Soccer Ball Case
  'RBC',   // Rugby Ball Case
  'HBC',   // Hockey Ball Case
  'FBC',   // Football Ball Case
  'FHBC',  // Field Hockey Ball Case
  'IHC',   // Ice Hockey (puck) Case

  // Display Cases (DC suffix)
  'BBDC',  // Baseball Ball Display Case
  'CDC',   // Cricket Display Case

  // Display Stands (DS suffix)
  'GBDS',  // Golf Ball Display Stand
  'CBDS',  // Cricket Ball Display Stand
  'TBDS',  // Tennis Ball Display Stand
  'FBDS',  // Football Display Stand
  'NFLBDS', // NFL Football Display Stand

  // Other prefixes
  'NFL',   // American Football (Etsy)
  'GBMS',  // Golf Ball Marker Stand
  'GBPS',  // Golf Pencil Stand

  // B-series new format (B1, B2, B3 are base sizes, not prefixes)
  // These don't follow the BC/DC/DS pattern
] as const;

// ============================================================================
// TITLE ANALYSIS - Extract product info from product names
// ============================================================================

/**
 * Product line keywords found in titles
 *
 * Product Line Definitions:
 * - HERITAGE: Solid wood base, NO turf/grass insert
 * - PRESTIGE: Solid wood base WITH turf/grass insert
 * - VANTAGE: Turf base (Premium Turf Base = PTB)
 * - ICON: High gloss black base, no turf
 */
const PRODUCT_LINE_KEYWORDS: Record<string, string> = {
  // Exact product line names
  'vantage': 'VANTAGE',
  'icon': 'ICON',
  'prestige': 'PRESTIGE',
  'heritage': 'HERITAGE',

  // Vantage indicators (turf base)
  'premium turf base': 'VANTAGE', // PTB = Vantage
  'turf base': 'VANTAGE',

  // Icon indicators (black gloss)
  'high gloss black': 'ICON',
  'black base': 'ICON',
  'gloss black': 'ICON',

  // Note: 'hardwood' alone doesn't indicate product line
  // Could be Heritage (no turf) or Prestige (with turf)
  // We only match if explicit product line name is in title
};

/**
 * Material keywords found in titles
 */
const MATERIAL_KEYWORDS: Record<string, string> = {
  'mahogany': 'MAH',
  'african hardwood': 'AHW',
  'hardwood': 'AHW',
  'solid oak': 'OAK',
  'oak': 'OAK',
  'olivewood': 'OLIVE',
  'olive': 'OLIVE',
  'afzelia': 'AFZ',
};

/**
 * Equivalent materials (can be mapped together)
 */
const EQUIVALENT_MATERIALS = ['AFZ', 'MAH', 'AHW'];

/**
 * Background keywords found in titles
 */
const BACKGROUND_KEYWORDS: Record<string, string> = {
  'hole in one': 'HIO',
  'hole-in-one': 'HIO',
  'champion': 'CHAMP',
  'legendary': 'LEG',
  'golf course': 'GC',
  'eagle': 'EAGLE',
  'birdie': 'BIRDIE',
  'par edition': 'PAR',
  'albatross': 'ALBATROSS',
  'stadium': 'STADIUM',
  'home run': 'HOMERUN',
  'custom': 'CUSTOMBG',
};

/**
 * Sport/category keywords found in titles
 */
const SPORT_KEYWORDS: Record<string, string> = {
  'golf ball': 'GBC',
  'golf display': 'GBC',
  'tennis ball': 'TBC',
  'baseball': 'BBC',
  'cricket ball': 'CBC',
  'cricket display': 'CDC',
  'soccer ball': 'SBC',
  'rugby ball': 'RBC',
  'hockey ball': 'HBC',
  'field hockey': 'FHBC',
  'football': 'FBC',
  'american football': 'NFL',
};

/**
 * Excluded product categories (not ball cases)
 * Note: Coins are NOT excluded - only jewellery products
 */
const EXCLUDED_KEYWORDS = [
  // Jewellery products (Bright Ivy)
  'jewel',
  'jewelry',
  'jewellery',
  'necklace',
  'bracelet',
  'earring',
  'earrings',
  'studs',
  'pendant',
  '14k gold',
  'gold-filled',
  'gold filled',
  'hypoallergenic',
  'sterling silver',
  'paperclip chain',
  'xoxo',
];

/**
 * Legacy SKU patterns and their current equivalents
 */
const LEGACY_SKU_PATTERNS: Array<{ pattern: RegExp; productLine: string; notes: string }> = [
  { pattern: /PTB/i, productLine: 'VANTAGE', notes: 'Premium Turf Base = Vantage' },
  { pattern: /GBB02/i, productLine: 'ICON', notes: 'Old Icon format' },
  { pattern: /02(?![0-9])/i, productLine: 'ICON', notes: 'Old Icon format (02 not followed by digit)' },
];

/**
 * Extract product line from title
 */
function extractProductLineFromTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [keyword, productLine] of Object.entries(PRODUCT_LINE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return productLine;
    }
  }
  return null;
}

/**
 * Extract material from title
 */
function extractMaterialFromTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [keyword, material] of Object.entries(MATERIAL_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return material;
    }
  }
  return null;
}

/**
 * Extract background from title
 */
function extractBackgroundFromTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [keyword, background] of Object.entries(BACKGROUND_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return background;
    }
  }
  return null;
}

/**
 * Extract sport/category from title
 */
function extractSportFromTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [keyword, sport] of Object.entries(SPORT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return sport;
    }
  }
  return null;
}

/**
 * Check if a SKU or title indicates an excluded product (jewellery, coins)
 */
function isExcludedProduct(sku: string, title: string): boolean {
  const combined = `${sku} ${title}`.toLowerCase();
  return EXCLUDED_KEYWORDS.some(keyword => combined.includes(keyword));
}

/**
 * Extract legacy product line from SKU
 */
function extractLegacyProductLine(sku: string): { productLine: string; notes: string } | null {
  const upper = sku.toUpperCase();
  for (const { pattern, productLine, notes } of LEGACY_SKU_PATTERNS) {
    if (pattern.test(upper)) {
      return { productLine, notes };
    }
  }
  return null;
}

/**
 * Extract material code from SKU
 */
function extractMaterialFromSku(sku: string): string | null {
  const upper = sku.toUpperCase();
  if (upper.includes('AHW')) return 'AHW';
  if (upper.includes('MAH')) return 'MAH';
  if (upper.includes('AFZ')) return 'AFZ';
  if (upper.includes('OAK')) return 'OAK';
  if (upper.includes('OLIVE')) return 'OLIVE';
  return null;
}

/**
 * Check if two materials are equivalent (AFZ ↔ MAH ↔ AHW)
 */
function areMaterialsEquivalent(mat1: string | null, mat2: string | null): boolean {
  if (!mat1 || !mat2) return false;
  if (mat1 === mat2) return true;
  return EQUIVALENT_MATERIALS.includes(mat1) && EQUIVALENT_MATERIALS.includes(mat2);
}

/**
 * Analyze a product and extract structured information from SKU and title
 */
interface ProductAnalysis {
  categoryPrefix: string | null;
  productLine: string | null;
  material: string | null;
  background: string | null;
  sport: string | null;
  isLegacy: boolean;
  legacyNotes: string | null;
  isExcluded: boolean;
}

function analyzeProduct(sku: string, title: string): ProductAnalysis {
  const categoryPrefix = getCategoryPrefix(sku);

  // Try to get product line from SKU first, then title
  let productLine = extractLegacyProductLine(sku)?.productLine || null;
  const legacyInfo = extractLegacyProductLine(sku);

  if (!productLine) {
    // Check SKU for known product lines
    const upper = sku.toUpperCase();
    if (upper.includes('VANTAGE')) productLine = 'VANTAGE';
    else if (upper.includes('ICON')) productLine = 'ICON';
    else if (upper.includes('PRESTIGE')) productLine = 'PRESTIGE';
    else if (upper.includes('HERITAGE') || upper.includes('HERI')) productLine = 'HERITAGE';
  }

  // Fall back to title analysis
  if (!productLine) {
    productLine = extractProductLineFromTitle(title);
  }

  // Material from SKU first, then title
  let material = extractMaterialFromSku(sku);
  if (!material) {
    material = extractMaterialFromTitle(title);
  }

  // Background from title (usually more reliable)
  const background = extractBackgroundFromTitle(title);

  // Sport from title
  const sport = extractSportFromTitle(title);

  return {
    categoryPrefix,
    productLine,
    material,
    background,
    sport,
    isLegacy: legacyInfo !== null,
    legacyNotes: legacyInfo?.notes || null,
    isExcluded: isExcludedProduct(sku, title),
  };
}

// ============================================================================
// CATEGORY PREFIX DETECTION
// ============================================================================

/**
 * Extract the category prefix from a SKU.
 * Uses known prefixes first for accuracy, then falls back to pattern detection.
 */
function getCategoryPrefix(sku: string): string | null {
  const upper = sku.toUpperCase().trim();

  // First check known prefixes (sorted by length descending to match longest first)
  const sortedPrefixes = [...KNOWN_CATEGORY_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (upper.startsWith(prefix)) {
      return prefix;
    }
  }

  // Fall back to pattern detection for unknown SKUs
  // Look for 2-6 letter category codes at the start that end with BC, DC, or DS
  for (const suffix of CATEGORY_SUFFIX_PATTERNS) {
    for (let len = 2; len <= 6; len++) {
      if (upper.length > len) {
        const potentialPrefix = upper.slice(0, len);
        if (potentialPrefix.endsWith(suffix) && /^[A-Z]+$/.test(potentialPrefix)) {
          return potentialPrefix;
        }
      }
    }
  }

  // Check for B-series format (B1-xxx, B2-xxx, B3-xxx)
  // These don't have traditional category prefixes
  if (/^B[123]-/.test(upper)) {
    return null; // B-series uses different categorization
  }

  return null;
}

/**
 * Extract the product name portion from a SKU (everything after the category prefix).
 */
function getProductName(sku: string): string {
  const upper = sku.toUpperCase().trim();
  const prefix = getCategoryPrefix(upper);

  let productName = prefix ? upper.slice(prefix.length) : upper;

  // Strip variant suffixes for comparison
  for (const suffix of DISPLAY_GROUP_SUFFIXES) {
    if (productName.endsWith(suffix)) {
      productName = productName.slice(0, -suffix.length);
      break;
    }
  }
  for (const suffix of VARIANT_SUFFIXES) {
    if (productName.endsWith(suffix) && productName.length > suffix.length) {
      productName = productName.slice(0, -suffix.length);
      break;
    }
  }

  return productName;
}

/**
 * Check if two SKUs have different category prefixes.
 */
function hasDifferentCategoryPrefix(sku1: string, sku2: string): boolean {
  const prefix1 = getCategoryPrefix(sku1);
  const prefix2 = getCategoryPrefix(sku2);

  if (prefix1 && prefix2 && prefix1 !== prefix2) {
    return true;
  }

  const productName1 = getProductName(sku1);
  const productName2 = getProductName(sku2);

  if (productName1 === productName2 && productName1.length > 0) {
    if (prefix1 !== prefix2) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// SIMILARITY CALCULATIONS
// ============================================================================

export interface SkuSuggestion {
  sourceSku: string;
  targetSku: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  score: number;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return 1 - distance / maxLen;
}

function extractNumericSegments(sku: string): string[] {
  const matches = sku.match(/\d+/g);
  return matches || [];
}

function differsByNumericSegment(sku1: string, sku2: string): boolean {
  const upper1 = sku1.toUpperCase();
  const upper2 = sku2.toUpperCase();

  const nums1 = extractNumericSegments(upper1);
  const nums2 = extractNumericSegments(upper2);

  const base1 = upper1.replace(/\d+/g, '#');
  const base2 = upper2.replace(/\d+/g, '#');

  if (base1 === base2 && nums1.join(',') !== nums2.join(',')) {
    return true;
  }

  const noNums1 = upper1.replace(/\d+/g, '');
  const noNums2 = upper2.replace(/\d+/g, '');

  if (noNums1 === noNums2 && (nums1.length !== nums2.length || nums1.join(',') !== nums2.join(','))) {
    return true;
  }

  return false;
}

function getBaseSku(sku: string): string {
  const upper = sku.toUpperCase().trim();
  for (const suffix of VARIANT_SUFFIXES) {
    if (upper.endsWith(suffix) && upper.length > suffix.length) {
      return upper.slice(0, -suffix.length);
    }
  }
  return upper;
}

function isVariantSku(sku: string): boolean {
  const upper = sku.toUpperCase().trim();
  return VARIANT_SUFFIXES.some(
    suffix => upper.endsWith(suffix) && upper.length > suffix.length
  );
}

function getDisplayGroupBase(sku: string): string {
  let result = sku.toUpperCase().trim();

  for (const suffix of DISPLAY_GROUP_SUFFIXES) {
    if (result.endsWith(suffix) && result.length > suffix.length) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }

  for (const suffix of VARIANT_SUFFIXES) {
    if (result.endsWith(suffix) && result.length > suffix.length) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }

  return result;
}

function differsOnlyByVariantSuffix(sku1: string, sku2: string): boolean {
  const base1 = getBaseSku(sku1);
  const base2 = getBaseSku(sku2);
  return base1 === base2 && (isVariantSku(sku1) !== isVariantSku(sku2));
}

function differsOnlyByDisplaySuffix(sku1: string, sku2: string): boolean {
  const upper1 = sku1.toUpperCase().trim();
  const upper2 = sku2.toUpperCase().trim();

  for (const suffix of DISPLAY_GROUP_SUFFIXES) {
    const has1 = upper1.endsWith(suffix);
    const has2 = upper2.endsWith(suffix);

    if (has1 !== has2) {
      const base1 = has1 ? upper1.slice(0, -suffix.length) : upper1;
      const base2 = has2 ? upper2.slice(0, -suffix.length) : upper2;
      if (base1 === base2) {
        return true;
      }
    }
  }

  return false;
}

function wordOverlapScore(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const words1 = new Set(name1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(name2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) overlap++;
  }

  const union = new Set([...words1, ...words2]).size;
  return overlap / union;
}

// ============================================================================
// SUGGESTION GENERATION WITH TITLE ANALYSIS
// ============================================================================

export interface SkuData {
  sku: string;
  productName: string;
  orderCount: number;
  platforms: string[];
}

/**
 * Calculate a match score between two products using both SKU and title analysis
 *
 * REJECTION RULES (returns null):
 * 1. Different product lines (VANTAGE vs ICON vs PRESTIGE vs HERITAGE) - Different BOM
 * 2. Different materials that are NOT equivalent (OAK vs MAH) - Different BOM
 *    Only AFZ/MAH/AHW are equivalent (material evolution)
 */
function calculateMatchScore(
  source: SkuData,
  target: SkuData,
  sourceAnalysis: ProductAnalysis,
  targetAnalysis: ProductAnalysis
): { score: number; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  const sourceUpper = source.sku.toUpperCase();
  const targetUpper = target.sku.toUpperCase();

  // ==========================================================================
  // REJECTION CHECKS - Different products that should NEVER be mapped
  // ==========================================================================

  // REJECT: Different product lines = Different BOM
  // Only allow if one or both don't have a detected product line
  if (sourceAnalysis.productLine && targetAnalysis.productLine) {
    if (sourceAnalysis.productLine !== targetAnalysis.productLine) {
      // Exception: Allow legacy SKU mappings where the legacy detection tells us they match
      const isLegacyMatch = (sourceAnalysis.isLegacy || targetAnalysis.isLegacy);
      if (!isLegacyMatch) {
        return null; // Different product lines = different products
      }
    }
  }

  // REJECT: Different materials that are NOT equivalent = Different BOM
  // OAK, OLIVE are standalone materials - not equivalent to anything
  // Only AFZ/MAH/AHW are equivalent to each other
  if (sourceAnalysis.material && targetAnalysis.material) {
    if (sourceAnalysis.material !== targetAnalysis.material) {
      // Check if they're in the equivalent materials list
      if (!areMaterialsEquivalent(sourceAnalysis.material, targetAnalysis.material)) {
        return null; // Different non-equivalent materials = different products
      }
    }
  }

  // ==========================================================================
  // SCORE CALCULATION
  // ==========================================================================

  // Base similarity scores
  const skuSimilarity = stringSimilarity(sourceUpper, targetUpper);
  const nameSimilarity = wordOverlapScore(source.productName, target.productName);

  // Start with combined score
  let score = skuSimilarity * 0.4 + nameSimilarity * 0.4;
  const reasons: string[] = [];

  // BOOST: Same product line from title analysis
  if (sourceAnalysis.productLine && targetAnalysis.productLine) {
    if (sourceAnalysis.productLine === targetAnalysis.productLine) {
      score += 0.15;
      reasons.push(`Same product line (${sourceAnalysis.productLine})`);
    }
  }

  // BOOST: Equivalent materials (AFZ/MAH/AHW)
  if (areMaterialsEquivalent(sourceAnalysis.material, targetAnalysis.material)) {
    score += 0.1;
    reasons.push(`Equivalent materials (${sourceAnalysis.material}→${targetAnalysis.material})`);
  }

  // BOOST: Legacy SKU detected
  if (sourceAnalysis.isLegacy || targetAnalysis.isLegacy) {
    const legacyNotes = sourceAnalysis.legacyNotes || targetAnalysis.legacyNotes;

    // Check if the legacy product line matches the other's product line
    const legacyProductLine = sourceAnalysis.isLegacy ? sourceAnalysis.productLine : targetAnalysis.productLine;
    const otherProductLine = sourceAnalysis.isLegacy ? targetAnalysis.productLine : sourceAnalysis.productLine;

    if (legacyProductLine && otherProductLine && legacyProductLine === otherProductLine) {
      score += 0.2;
      reasons.push(`Legacy SKU mapping (${legacyNotes})`);
    }
  }

  // BOOST: Same background from title
  if (sourceAnalysis.background && targetAnalysis.background) {
    if (sourceAnalysis.background === targetAnalysis.background) {
      score += 0.05;
      reasons.push(`Same background (${sourceAnalysis.background})`);
    }
  }

  // BOOST: Very high title similarity (likely same product)
  if (nameSimilarity >= 0.8) {
    score += 0.1;
    reasons.push('Very similar titles');
  }

  // Determine confidence based on score and reasons
  let confidence: 'high' | 'medium' | 'low';
  if (score >= 0.85 || (sourceAnalysis.isLegacy || targetAnalysis.isLegacy) && score >= 0.7) {
    confidence = 'high';
  } else if (score >= 0.65) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Build reason string
  let reason = `SKU ${Math.round(skuSimilarity * 100)}%, Title ${Math.round(nameSimilarity * 100)}%`;
  if (reasons.length > 0) {
    reason += ` | ${reasons.join(', ')}`;
  }

  return { score, confidence, reason };
}

/**
 * Generate mapping suggestions for a source SKU.
 * Returns suggested target SKUs with confidence levels.
 */
export function getSuggestionsForSku(
  sourceSku: SkuData,
  allSkus: SkuData[],
  maxSuggestions: number = 3
): SkuSuggestion[] {
  const suggestions: SkuSuggestion[] = [];
  const sourceUpper = sourceSku.sku.toUpperCase();

  // Analyze source product
  const sourceAnalysis = analyzeProduct(sourceSku.sku, sourceSku.productName);

  // Skip excluded products (jewellery, coins)
  if (sourceAnalysis.isExcluded) {
    return [];
  }

  for (const target of allSkus) {
    // Skip self
    if (target.sku.toUpperCase() === sourceUpper) continue;

    const targetUpper = target.sku.toUpperCase();
    const targetAnalysis = analyzeProduct(target.sku, target.productName);

    // Skip excluded products
    if (targetAnalysis.isExcluded) {
      continue;
    }

    // REJECT: Numeric differences (different products)
    if (differsByNumericSegment(sourceUpper, targetUpper)) {
      continue;
    }

    // REJECT: Different category prefixes (GBC vs TBC vs GBDS etc.)
    // Different prefixes = Different product types = Different BOM
    // GBC (Case) ≠ GBDS (Stand), even if same sport
    if (hasDifferentCategoryPrefix(sourceUpper, targetUpper)) {
      continue;
    }

    // SKIP: P-suffix variants - auto-handled
    if (differsOnlyByVariantSuffix(sourceUpper, targetUpper)) {
      continue;
    }

    // SKIP: -BALL suffix variants - grouped for display
    if (differsOnlyByDisplaySuffix(sourceUpper, targetUpper)) {
      continue;
    }

    // SKIP: Same base product variants
    const sourceDisplayBase = getDisplayGroupBase(sourceUpper);
    const targetDisplayBase = getDisplayGroupBase(targetUpper);
    if (sourceDisplayBase === targetDisplayBase) {
      continue;
    }

    // Calculate match score with title analysis
    const matchResult = calculateMatchScore(sourceSku, target, sourceAnalysis, targetAnalysis);
    if (!matchResult) continue;

    // Only suggest if score meets threshold
    // Lower threshold for legacy SKUs (they often look very different)
    const threshold = (sourceAnalysis.isLegacy || targetAnalysis.isLegacy) ? 0.45 : 0.5;

    if (matchResult.score >= threshold) {
      suggestions.push({
        sourceSku: sourceSku.sku,
        targetSku: target.sku,
        confidence: matchResult.confidence,
        reason: matchResult.reason,
        score: matchResult.score,
      });
    }
  }

  // Sort by score descending and limit
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}

/**
 * Generate all suggestions for unmapped SKUs.
 */
export function generateAllSuggestions(
  skus: SkuData[],
  mappedSkus: Set<string> = new Set()
): SkuSuggestion[] {
  const allSuggestions: SkuSuggestion[] = [];

  for (const sku of skus) {
    // Skip already mapped
    if (mappedSkus.has(sku.sku.toUpperCase())) continue;

    const suggestions = getSuggestionsForSku(sku, skus, 2);
    allSuggestions.push(...suggestions);
  }

  // Deduplicate (A->B and B->A)
  const seen = new Set<string>();
  return allSuggestions.filter(s => {
    const key1 = `${s.sourceSku}|${s.targetSku}`.toUpperCase();
    const key2 = `${s.targetSku}|${s.sourceSku}`.toUpperCase();
    if (seen.has(key1) || seen.has(key2)) return false;
    seen.add(key1);
    return true;
  });
}

// Export analysis function for debugging/display
export { analyzeProduct, type ProductAnalysis };
