'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, Package, ArrowUpDown, Lightbulb, Check, X, Link2, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getBaseSku, isVariantSku, isBallVariant, isAnyVariant } from '@/lib/inventory/sku-utils';

interface SkuSuggestion {
  sourceSku: string;
  targetSku: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  score: number;
}

interface SkuData {
  sku: string;
  productName: string;
  orderCount: number;
  totalQuantity: number;
  platforms: string[];
  brands: string[];
  firstSeen: string;
  lastSeen: string;
}

interface ExistingMapping {
  id: string;
  old_sku: string;
  current_sku: string;
  brand_id: string | null;
  platform: string | null;
  notes: string | null;
  created_at: string;
}

// Extended SkuData with variant info when grouped
interface SkuDataWithVariants extends SkuData {
  _variantCount?: number;
  _variants?: SkuData[];
}

type SortField = 'sku' | 'orderCount' | 'lastSeen' | 'productName';
type SortDirection = 'asc' | 'desc';

export default function SkuMappingPage() {
  const [mounted, setMounted] = useState(false);
  const [skus, setSkus] = useState<SkuData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [hideVariants, setHideVariants] = useState(false);
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('orderCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [suggestions, setSuggestions] = useState<SkuSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Selection for bulk mapping
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());

  // Manual mapping dialog
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapTargetSku, setMapTargetSku] = useState<string | null>(null);

  // Existing mappings
  const [existingMappings, setExistingMappings] = useState<ExistingMapping[]>([]);
  const [showExistingMappings, setShowExistingMappings] = useState(false);

  // Fix hydration mismatch with Radix UI Select components
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSkus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/sku-discovery');
      if (!res.ok) throw new Error('Failed to fetch SKUs');
      const data = await res.json();
      setSkus(data.skus || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingMappings = async () => {
    try {
      const res = await fetch('/api/inventory/sku-mapping');
      if (!res.ok) throw new Error('Failed to fetch mappings');
      const data = await res.json();
      setExistingMappings(data.mappings || []);
    } catch (err) {
      console.error('Failed to fetch existing mappings:', err);
    }
  };

  const deleteMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const res = await fetch(`/api/inventory/sku-mapping?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to delete mapping: ${data.error}`);
        return;
      }

      // Refresh the list
      fetchExistingMappings();
    } catch (err) {
      console.error('Failed to delete mapping:', err);
      alert('Failed to delete mapping');
    }
  };

  useEffect(() => {
    fetchSkus();
    fetchExistingMappings();
  }, []);

  // Fetch suggestions - ONLY called on button click, not auto-loaded
  const fetchSuggestions = async () => {
    if (skus.length === 0) return;

    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/inventory/sku-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skus: skus.map(s => ({
            sku: s.sku,
            productName: s.productName,
            orderCount: s.orderCount,
            platforms: s.platforms,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const [savingMapping, setSavingMapping] = useState(false);

  const dismissSuggestion = (sourceSku: string, targetSku: string) => {
    const key = `${sourceSku}|${targetSku}`;
    setDismissedSuggestions(prev => new Set([...prev, key]));
  };

  const saveMapping = async (
    oldSku: string,
    currentSku: string,
    notes: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/inventory/sku-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldSku,
          currentSku,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          alert(`Mapping already exists for ${oldSku}`);
        } else {
          alert(`Failed to save mapping: ${data.error}`);
        }
        return false;
      }

      // Refresh the existing mappings list
      fetchExistingMappings();
      return true;
    } catch (err) {
      console.error('Failed to save mapping:', err);
      alert('Failed to save mapping');
      return false;
    }
  };

  const acceptSuggestion = async (suggestion: SkuSuggestion) => {
    setSavingMapping(true);
    const success = await saveMapping(
      suggestion.sourceSku,
      suggestion.targetSku,
      `${suggestion.confidence} confidence: ${suggestion.reason}`
    );
    setSavingMapping(false);

    if (success) {
      dismissSuggestion(suggestion.sourceSku, suggestion.targetSku);
    }
  };

  // Toggle SKU selection
  const toggleSkuSelection = (sku: string) => {
    setSelectedSkus(prev => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  };

  // Select/deselect all visible SKUs
  const toggleSelectAll = () => {
    if (selectedSkus.size === filteredAndSortedSkus.length) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(filteredAndSortedSkus.map(s => s.sku)));
    }
  };

  // Open manual mapping dialog for selected SKUs
  const openMapDialog = () => {
    if (selectedSkus.size < 2) {
      alert('Select at least 2 SKUs to create a mapping');
      return;
    }
    setMapTargetSku(null);
    setMapDialogOpen(true);
  };

  // Save manual mapping - map all selected SKUs (except target) to the target
  const saveManualMapping = async () => {
    if (!mapTargetSku || selectedSkus.size < 2) return;

    // Get all underlying SKUs (expands grouped rows to their variants)
    const allUnderlyingSkus = getUnderlyingSkus(selectedSkus);

    // Check which SKUs are already mapped
    const skusToMap = allUnderlyingSkus.filter(sku => {
      if (sku === mapTargetSku) return false; // Skip the target itself
      if (mappedSkusLookup.has(sku)) return false; // Skip already mapped
      return true;
    });

    const alreadyMapped = allUnderlyingSkus.filter(sku =>
      sku !== mapTargetSku && mappedSkusLookup.has(sku)
    );

    if (skusToMap.length === 0) {
      alert(`All selected SKUs are already mapped:\n${alreadyMapped.map(s => `${s} → ${mappedSkusLookup.get(s)}`).join('\n')}`);
      return;
    }

    setSavingMapping(true);
    let successCount = 0;
    let errorCount = 0;

    for (const sku of skusToMap) {
      const success = await saveMapping(
        sku,
        mapTargetSku,
        `Bulk mapping to ${mapTargetSku}`
      );

      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setSavingMapping(false);

    let message = `Created ${successCount} mapping(s)`;
    if (errorCount > 0) message += `, ${errorCount} failed`;
    if (alreadyMapped.length > 0) message += `, ${alreadyMapped.length} already mapped`;

    alert(message);
    setMapDialogOpen(false);
    setMapTargetSku(null);
    setSelectedSkus(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Aggregated SKUs when hideVariants is enabled
  const aggregatedSkus = useMemo(() => {
    if (!hideVariants) return null;

    // Group by base SKU
    const groups = new Map<string, {
      baseSku: string;
      skus: SkuData[];
      totalOrders: number;
      totalQuantity: number;
      platforms: Set<string>;
      brands: Set<string>;
      firstSeen: string;
      lastSeen: string;
      productName: string;
    }>();

    for (const sku of skus) {
      const base = getBaseSku(sku.sku);
      const existing = groups.get(base);

      if (existing) {
        existing.skus.push(sku);
        existing.totalOrders += sku.orderCount;
        existing.totalQuantity += sku.totalQuantity;
        sku.platforms.forEach(p => existing.platforms.add(p));
        sku.brands.forEach(b => existing.brands.add(b));
        if (sku.firstSeen < existing.firstSeen) existing.firstSeen = sku.firstSeen;
        if (sku.lastSeen > existing.lastSeen) existing.lastSeen = sku.lastSeen;
        // Use product name from base SKU if available
        if (!isAnyVariant(sku.sku) && sku.productName) {
          existing.productName = sku.productName;
        }
      } else {
        groups.set(base, {
          baseSku: base,
          skus: [sku],
          totalOrders: sku.orderCount,
          totalQuantity: sku.totalQuantity,
          platforms: new Set(sku.platforms),
          brands: new Set(sku.brands),
          firstSeen: sku.firstSeen,
          lastSeen: sku.lastSeen,
          productName: sku.productName,
        });
      }
    }

    return groups;
  }, [skus, hideVariants]);

  // Lookup for already-mapped SKUs (moved before filteredAndSortedSkus so it can be used for filtering)
  const mappedSkusLookup = useMemo(() => {
    const lookup = new Map<string, string>(); // old_sku -> current_sku
    for (const mapping of existingMappings) {
      lookup.set(mapping.old_sku, mapping.current_sku);
    }
    return lookup;
  }, [existingMappings]);

  // Helper to check if a SKU row has any mapped variants
  const isRowMapped = (skuData: SkuDataWithVariants): boolean => {
    // Check the main SKU
    if (mappedSkusLookup.has(skuData.sku)) return true;

    // If this is a grouped row, check all variants
    if (skuData._variants && skuData._variants.length > 1) {
      for (const variant of skuData._variants) {
        if (mappedSkusLookup.has(variant.sku)) return true;
      }
    }

    return false;
  };

  const filteredAndSortedSkus = useMemo(() => {
    let result: SkuData[];

    if (hideVariants && aggregatedSkus) {
      // Convert aggregated groups to SkuData format
      result = Array.from(aggregatedSkus.values()).map(group => ({
        sku: group.baseSku,
        productName: group.productName,
        orderCount: group.totalOrders,
        totalQuantity: group.totalQuantity,
        platforms: Array.from(group.platforms),
        brands: Array.from(group.brands),
        firstSeen: group.firstSeen,
        lastSeen: group.lastSeen,
        // Store variant count for display (using a type assertion hack)
        ...({ _variantCount: group.skus.length, _variants: group.skus } as object),
      }));
    } else {
      result = [...skus];
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        s =>
          s.sku.toLowerCase().includes(searchLower) ||
          s.productName.toLowerCase().includes(searchLower)
      );
    }

    // Filter by platform
    if (platformFilter !== 'all') {
      result = result.filter(s => s.platforms.includes(platformFilter));
    }

    // Filter by brand
    if (brandFilter !== 'all') {
      result = result.filter(s => s.brands.includes(brandFilter));
    }

    // Filter to show only unmapped SKUs
    if (showUnmappedOnly) {
      result = result.filter(s => !isRowMapped(s as SkuDataWithVariants));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'sku':
          comparison = a.sku.localeCompare(b.sku);
          break;
        case 'orderCount':
          comparison = a.orderCount - b.orderCount;
          break;
        case 'lastSeen':
          comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
          break;
        case 'productName':
          comparison = a.productName.localeCompare(b.productName);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [skus, search, platformFilter, brandFilter, hideVariants, aggregatedSkus, sortField, sortDirection, showUnmappedOnly, mappedSkusLookup]);

  // Get the selected SKU data objects (use filtered list which handles grouping)
  const selectedSkuData = useMemo(() => {
    return filteredAndSortedSkus.filter(s => selectedSkus.has(s.sku));
  }, [filteredAndSortedSkus, selectedSkus]);

  // Filter out dismissed suggestions
  const activeSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      const key = `${s.sourceSku}|${s.targetSku}`;
      return !dismissedSuggestions.has(key);
    });
  }, [suggestions, dismissedSuggestions]);

  // Group SKUs by base SKU to show variant relationships
  const variantGroups = useMemo(() => {
    const groups = new Map<string, SkuData[]>();
    for (const sku of skus) {
      const base = getBaseSku(sku.sku);
      const existing = groups.get(base) || [];
      existing.push(sku);
      groups.set(base, existing);
    }
    // Only return groups with multiple SKUs (i.e., has variants)
    return new Map(Array.from(groups.entries()).filter(([, items]) => items.length > 1));
  }, [skus]);

  // Helper to get all mapped SKUs for a row (handles grouped SKUs)
  const getMappedSkusForRow = (sku: SkuDataWithVariants): { sku: string; mappedTo: string }[] => {
    const mapped: { sku: string; mappedTo: string }[] = [];

    // Check the main SKU
    if (mappedSkusLookup.has(sku.sku)) {
      mapped.push({ sku: sku.sku, mappedTo: mappedSkusLookup.get(sku.sku)! });
    }

    // If this is a grouped row, also check all variants
    if (sku._variants && sku._variants.length > 1) {
      for (const variant of sku._variants) {
        if (variant.sku !== sku.sku && mappedSkusLookup.has(variant.sku)) {
          mapped.push({ sku: variant.sku, mappedTo: mappedSkusLookup.get(variant.sku)! });
        }
      }
    }

    return mapped;
  };

  // Get all underlying SKUs for selected rows (expands grouped SKUs to variants)
  const getUnderlyingSkus = (selectedSet: Set<string>): string[] => {
    const allSkus: string[] = [];

    for (const skuKey of selectedSet) {
      const skuData = filteredAndSortedSkus.find(s => s.sku === skuKey) as SkuDataWithVariants | undefined;
      if (skuData?._variants && skuData._variants.length > 1) {
        // It's a grouped row - add all variants
        for (const variant of skuData._variants) {
          allSkus.push(variant.sku);
        }
      } else {
        allSkus.push(skuKey);
      }
    }

    return allSkus;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SKU Mapping</h1>
          <p className="text-muted-foreground">
            Discover and map product SKUs across platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchSuggestions}
            disabled={loading || loadingSuggestions || skus.length === 0}
          >
            <Lightbulb className={`h-4 w-4 mr-2 ${loadingSuggestions ? 'animate-pulse' : ''}`} />
            {loadingSuggestions ? 'Analyzing...' : 'Get Suggestions'}
          </Button>
          <Button onClick={fetchSkus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skus.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variant Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{variantGroups.size}</div>
            <p className="text-xs text-muted-foreground">SKUs with P suffix variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Multi-Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {skus.filter(s => s.platforms.length > 1).length}
            </div>
            <p className="text-xs text-muted-foreground">SKUs on both Shopify &amp; Etsy</p>
          </CardContent>
        </Card>
        <Card
          className={existingMappings.length > 0 ? 'cursor-pointer hover:border-blue-300 transition-colors' : ''}
          onClick={() => existingMappings.length > 0 && setShowExistingMappings(!showExistingMappings)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saved Mappings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{existingMappings.length}</div>
            {existingMappings.length > 0 && (
              <p className="text-xs text-muted-foreground">Click to {showExistingMappings ? 'hide' : 'view'}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Showing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAndSortedSkus.length}
              <span className="text-base font-normal text-muted-foreground"> of {skus.length}</span>
            </div>
            {filteredAndSortedSkus.length !== skus.length && (
              <p className="text-xs text-muted-foreground">Filters applied</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suggestions Panel - Only shown after clicking Get Suggestions */}
      {showSuggestions && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                Suggested Mappings
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {activeSuggestions.length} suggestions found. Review and accept or dismiss.
            </p>
          </CardHeader>
          <CardContent>
            {activeSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No suggestions remaining. All have been reviewed.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activeSuggestions.map((suggestion, idx) => (
                  <div
                    key={`${suggestion.sourceSku}-${suggestion.targetSku}-${idx}`}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {suggestion.sourceSku}
                        </code>
                        <span className="text-muted-foreground">→</span>
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {suggestion.targetSku}
                        </code>
                      </div>
                      <Badge
                        className={
                          suggestion.confidence === 'high'
                            ? 'bg-green-100 text-green-700'
                            : suggestion.confidence === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {suggestion.confidence}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {suggestion.reason}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => acceptSuggestion(suggestion)}
                        disabled={savingMapping}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => dismissSuggestion(suggestion.sourceSku, suggestion.targetSku)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Mappings Panel */}
      {existingMappings.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-600" />
                Saved Mappings
                <Badge variant="secondary">{existingMappings.length}</Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExistingMappings(!showExistingMappings)}
              >
                {showExistingMappings ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {showExistingMappings && (
            <CardContent className="pt-0">
              {/* Group mappings by target SKU */}
              {(() => {
                // Group mappings by current_sku
                const groupedMappings = new Map<string, ExistingMapping[]>();
                for (const mapping of existingMappings) {
                  const group = groupedMappings.get(mapping.current_sku) || [];
                  group.push(mapping);
                  groupedMappings.set(mapping.current_sku, group);
                }

                const groups = Array.from(groupedMappings.entries())
                  .sort((a, b) => b[1].length - a[1].length); // Sort by group size desc

                return (
                  <div className="relative">
                    <div className="max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
                      <div className="space-y-3">
                        {groups.map(([targetSku, mappings]) => (
                          <div key={targetSku} className="bg-white rounded-lg border p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Target:</span>
                              <code className="font-mono text-sm font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                {targetSku}
                              </code>
                              {mappings.length > 1 && (
                                <Badge className="bg-blue-100 text-blue-700">
                                  {mappings.length} SKUs mapped here
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 pl-2 border-l-2 border-green-200">
                              {mappings.map(mapping => (
                                <div key={mapping.id} className="flex items-center justify-between py-1 group">
                                  <div className="flex items-center gap-3">
                                    <code className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                                      {mapping.old_sku}
                                    </code>
                                    <span className="text-muted-foreground">→</span>
                                    {mapping.platform && (
                                      <Badge variant="outline" className="text-xs">
                                        {mapping.platform}
                                      </Badge>
                                    )}
                                    {mapping.notes && (
                                      <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={mapping.notes}>
                                        {mapping.notes}
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => deleteMapping(mapping.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Scroll indicator */}
                    {existingMappings.length > 5 && (
                      <div className="absolute bottom-0 left-0 right-2 h-8 bg-gradient-to-t from-blue-50 to-transparent pointer-events-none flex items-end justify-center pb-1">
                        <span className="text-xs text-muted-foreground bg-blue-50 px-2 rounded">
                          ↓ Scroll for more
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU or product name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Render Selects only after mount to prevent hydration mismatch */}
            {mounted ? (
              <>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="shopify">Shopify</SelectItem>
                    <SelectItem value="etsy">Etsy</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    <SelectItem value="DC">Display Champ</SelectItem>
                    <SelectItem value="BI">Bright Ivy</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                {/* Placeholder during SSR to prevent layout shift */}
                <div className="w-[140px] h-9 rounded-md border bg-background" />
                <div className="w-[140px] h-9 rounded-md border bg-background" />
              </>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideVariants}
                onChange={e => setHideVariants(e.target.checked)}
                className="rounded"
              />
              Hide variants (P & -BALL)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showUnmappedOnly}
                onChange={e => setShowUnmappedOnly(e.target.checked)}
                className="rounded"
              />
              Unmapped only
            </label>
          </div>
        </CardContent>
      </Card>

      {/* SKU Table */}
      <Card>
        {/* Sticky selection toolbar */}
        {selectedSkus.size > 0 && (
          <div className="sticky top-0 z-20 bg-white border-b px-6 py-3 flex items-center gap-4 shadow-sm">
            <Badge variant="secondary" className="text-sm">
              {selectedSkus.size} selected
            </Badge>
            <Button
              onClick={openMapDialog}
              disabled={selectedSkus.size < 2}
              size="sm"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Map Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSkus(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}
        <CardContent className="pt-2">
          {error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading SKUs...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px] px-2">
                      <input
                        type="checkbox"
                        checked={selectedSkus.size === filteredAndSortedSkus.length && filteredAndSortedSkus.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>
                      <SortButton field="sku">SKU</SortButton>
                    </TableHead>
                    <TableHead className="max-w-[180px]">
                      <SortButton field="productName">Product</SortButton>
                    </TableHead>
                    <TableHead className="w-[70px]">
                      <SortButton field="orderCount">Orders</SortButton>
                    </TableHead>
                    <TableHead className="w-[100px]">Platforms</TableHead>
                    <TableHead className="w-[50px]">Brand</TableHead>
                    <TableHead className="w-[90px]">
                      <SortButton field="lastSeen">Last Seen</SortButton>
                    </TableHead>
                    <TableHead className="w-[70px]">{hideVariants ? 'Group' : 'Type'}</TableHead>
                    <TableHead>Mapped To</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredAndSortedSkus.map(skuItem => {
                  const sku = skuItem as SkuDataWithVariants;
                  const isVariant = isVariantSku(sku.sku);
                  const baseSku = getBaseSku(sku.sku);
                  const hasVariants = variantGroups.has(baseSku);
                  const isSelected = selectedSkus.has(sku.sku);
                  const variantCount = sku._variantCount || 0;
                  const variants = sku._variants || [];

                  return (
                    <TableRow key={sku.sku} className={isSelected ? 'bg-blue-50' : ''}>
                      <TableCell className="px-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSkuSelection(sku.sku)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {search ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: sku.sku.replace(
                                new RegExp(`(${search})`, 'gi'),
                                '<mark class="bg-yellow-200">$1</mark>'
                              ),
                            }}
                          />
                        ) : (
                          sku.sku
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm" title={sku.productName}>
                        {search ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: sku.productName.replace(
                                new RegExp(`(${search})`, 'gi'),
                                '<mark class="bg-yellow-200">$1</mark>'
                              ),
                            }}
                          />
                        ) : (
                          sku.productName
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sku.orderCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {sku.platforms.map(p => (
                            <Badge
                              key={p}
                              variant="outline"
                              className={
                                p === 'shopify'
                                  ? 'border-green-500 text-green-700'
                                  : 'border-orange-500 text-orange-700'
                              }
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {sku.brands.map(b => (
                            <Badge key={b} variant="outline">
                              {b}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(sku.lastSeen)}
                      </TableCell>
                      <TableCell>
                        {variantCount > 1 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="cursor-help text-xs">
                                  {variantCount} grouped
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium mb-1">Grouped SKUs:</p>
                                  {variants.map(v => (
                                    <div key={v.sku} className="flex justify-between gap-4 text-xs">
                                      <code className="font-mono">{v.sku}</code>
                                      <span>{v.orderCount} orders</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <>
                            {isVariant && <Badge className="bg-blue-100 text-blue-700 text-xs">P</Badge>}
                            {isBallVariant(sku.sku) && <Badge className="bg-orange-100 text-orange-700 text-xs">BALL</Badge>}
                            {!isVariant && !isBallVariant(sku.sku) && hasVariants && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">+variants</Badge>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const mapped = getMappedSkusForRow(sku);
                          if (mapped.length === 0) return null;

                          if (mapped.length === 1) {
                            return (
                              <Badge className="bg-green-100 text-green-700">
                                → {mapped[0].mappedTo}
                              </Badge>
                            );
                          }

                          // Multiple variants are mapped
                          return (
                            <Badge
                              className="bg-green-100 text-green-700 cursor-help"
                              title={mapped.map(m => `${m.sku} → ${m.mappedTo}`).join('\n')}
                            >
                              {mapped.length} mapped
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Mapping Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Map Selected SKUs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">
                Select which SKU should be the <span className="text-green-600">canonical (target)</span> SKU.
                All others will be mapped to it.
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedSkus.size} row{selectedSkus.size > 1 ? 's' : ''} selected
                {hideVariants && (() => {
                  const totalVariants = getUnderlyingSkus(selectedSkus).length;
                  return totalVariants > selectedSkus.size ? ` (${totalVariants} variants total)` : '';
                })()}
              </p>
            </div>

            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {selectedSkuData.map(sku => (
                <div
                  key={sku.sku}
                  className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                    mapTargetSku === sku.sku ? 'bg-green-50 border-green-200' : ''
                  }`}
                  onClick={() => setMapTargetSku(sku.sku)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="targetSku"
                        checked={mapTargetSku === sku.sku}
                        onChange={() => setMapTargetSku(sku.sku)}
                        className="h-4 w-4"
                      />
                      <div>
                        <code className="text-sm font-mono font-medium">{sku.sku}</code>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {sku.productName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {sku.orderCount} orders
                      </Badge>
                      {mapTargetSku === sku.sku && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          Target
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {mapTargetSku && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 mb-2">Mapping preview:</p>
                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  {(() => {
                    const allSkus = getUnderlyingSkus(selectedSkus);
                    const skusToShow = allSkus.filter(sku => sku !== mapTargetSku);
                    const alreadyMapped = skusToShow.filter(sku => mappedSkusLookup.has(sku));
                    const newMappings = skusToShow.filter(sku => !mappedSkusLookup.has(sku));

                    return (
                      <>
                        {newMappings.map(sku => (
                          <div key={sku} className="flex items-center gap-2 text-sm">
                            <code className="font-mono bg-white px-1 rounded">{sku}</code>
                            <span className="text-muted-foreground">→</span>
                            <code className="font-mono bg-green-100 px-1 rounded text-green-700">{mapTargetSku}</code>
                          </div>
                        ))}
                        {alreadyMapped.map(sku => (
                          <div key={sku} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <code className="font-mono bg-gray-100 px-1 rounded line-through">{sku}</code>
                            <span>already mapped to</span>
                            <code className="font-mono bg-gray-100 px-1 rounded">{mappedSkusLookup.get(sku)}</code>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialogOpen(false)}>
              Cancel
            </Button>
            {(() => {
              const allSkus = getUnderlyingSkus(selectedSkus);
              const newMappingCount = allSkus.filter(sku =>
                sku !== mapTargetSku && !mappedSkusLookup.has(sku)
              ).length;

              return (
                <Button onClick={saveManualMapping} disabled={!mapTargetSku || savingMapping || newMappingCount === 0}>
                  <Link2 className={`h-4 w-4 mr-2 ${savingMapping ? 'animate-spin' : ''}`} />
                  {savingMapping ? 'Saving...' : newMappingCount === 0 ? 'All Already Mapped' : `Create ${newMappingCount} Mapping${newMappingCount > 1 ? 's' : ''}`}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
