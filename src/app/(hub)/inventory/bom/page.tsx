'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  ChevronRight,
  ChevronDown,
  Package,
  Layers,
  AlertCircle,
  Check,
  ShoppingCart,
  Archive,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Brand, ComponentCategory, StockLevel } from '@/types';
import { COMPONENT_CATEGORY_LABELS, ComponentCategoryName } from '@/types';

interface ProductWithBom {
  id: string;
  sku: string;
  name: string;
  brand_id: string | null;
  status: 'active' | 'historic' | 'discontinued';
  platforms: string[];
  brand: Brand | null;
  bomCount: number;
}

interface ComponentWithStock {
  id: string;
  sku: string;
  name: string;
  material: string | null;
  variant: string | null;
  is_active: boolean;
  category: ComponentCategory | null;
  stock: StockLevel[] | StockLevel | null;
}

interface BomEntryExtended {
  id: string;
  product_sku: string;
  brand_id: string | null;
  component_id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  component: ComponentWithStock | null;
  brand: Brand | null;
}

// Helper to get stock from component
function getStock(component: ComponentWithStock | null): StockLevel | null {
  if (!component?.stock) return null;
  return Array.isArray(component.stock) ? component.stock[0] : component.stock;
}

export default function BomEditorPage() {
  const [bomEntries, setBomEntries] = useState<BomEntryExtended[]>([]);
  const [products, setProducts] = useState<ProductWithBom[]>([]);
  const [components, setComponents] = useState<ComponentWithStock[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    productsWithBom: 0,
    productsWithoutBom: 0,
    totalBomEntries: 0,
  });
  const [statusCounts, setStatusCounts] = useState({
    active: 0,
    historic: 0,
    discontinued: 0,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterBomStatus, setFilterBomStatus] = useState<string>('all');
  const [filterProductStatus, setFilterProductStatus] = useState<string>('active');
  const [mounted, setMounted] = useState(false);

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBom | null>(null);
  const [editingEntry, setEditingEntry] = useState<BomEntryExtended | null>(null);

  // Form state
  const [formComponentId, setFormComponentId] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<number | ''>(1);
  const [formNotes, setFormNotes] = useState<string>('');
  const [componentSearch, setComponentSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBrand !== 'all') params.set('brand', filterBrand);
      if (filterProductStatus !== 'all') params.set('status', filterProductStatus);

      const response = await fetch(`/api/inventory/bom?${params}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setBomEntries(data.bomEntries || []);
      setProducts(data.products || []);
      setComponents(data.components || []);
      setBrands(data.brands || []);
      setSummary(data.summary || {
        totalProducts: 0,
        productsWithBom: 0,
        productsWithoutBom: 0,
        totalBomEntries: 0,
      });
      setStatusCounts(data.statusCounts || {
        active: 0,
        historic: 0,
        discontinued: 0,
        total: 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load BOM data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [filterBrand, filterProductStatus]);

  // Filter products based on search and BOM status
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.sku.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query)
      );
    }

    if (filterBomStatus === 'with-bom') {
      filtered = filtered.filter((p) => p.bomCount > 0);
    } else if (filterBomStatus === 'missing-bom') {
      filtered = filtered.filter((p) => p.bomCount === 0);
    }

    return filtered;
  }, [products, searchQuery, filterBomStatus]);

  // Get BOM entries for a specific product
  const getProductBomEntries = (productSku: string) => {
    return bomEntries.filter((entry) => entry.product_sku === productSku);
  };

  // Filter components for dropdown (exclude already added ones)
  const availableComponents = useMemo(() => {
    if (!selectedProduct) return components;

    const existingComponentIds = new Set(
      bomEntries
        .filter((e) => e.product_sku === selectedProduct.sku)
        .map((e) => e.component_id)
    );

    let filtered = components.filter((c) => !existingComponentIds.has(c.id));

    if (componentSearch) {
      const search = componentSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.sku.toLowerCase().includes(search) ||
          c.name.toLowerCase().includes(search) ||
          c.material?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [components, selectedProduct, bomEntries, componentSearch]);

  const toggleProductExpanded = (productSku: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productSku)) {
      newExpanded.delete(productSku);
    } else {
      newExpanded.add(productSku);
    }
    setExpandedProducts(newExpanded);
  };

  const resetForm = () => {
    setFormComponentId('');
    setFormQuantity(1);
    setFormNotes('');
    setComponentSearch('');
  };

  const handleOpenAddDialog = (product: ProductWithBom) => {
    setSelectedProduct(product);
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (entry: BomEntryExtended) => {
    setEditingEntry(entry);
    setFormQuantity(entry.quantity);
    setFormNotes(entry.notes || '');
    setIsEditDialogOpen(true);
  };

  const handleAddComponent = async () => {
    if (!selectedProduct || !formComponentId) {
      toast.error('Please select a component');
      return;
    }

    try {
      const response = await fetch('/api/inventory/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_sku: selectedProduct.sku,
          brand_id: selectedProduct.brand_id,
          component_id: formComponentId,
          quantity: typeof formQuantity === 'number' ? formQuantity : 1,
          notes: formNotes || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Component added to BOM');
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();

      // Auto-expand the product to show the new entry
      setExpandedProducts((prev) => new Set(prev).add(selectedProduct.sku));
    } catch (error) {
      console.error('Error adding component:', error);
      toast.error('Failed to add component');
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      const response = await fetch('/api/inventory/bom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id,
          quantity: typeof formQuantity === 'number' ? formQuantity : 1,
          notes: formNotes || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('BOM entry updated');
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      fetchData();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to remove this component from the BOM?')) return;

    try {
      const response = await fetch(`/api/inventory/bom?id=${entryId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Component removed from BOM');
      fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to remove component');
    }
  };

  const selectedComponent = components.find((c) => c.id === formComponentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bill of Materials</h2>
          <p className="text-muted-foreground">
            Define which components make up each product
          </p>
        </div>
      </div>

      {/* Status Filter Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterProductStatus === 'active' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20' : ''
          }`}
          onClick={() => setFilterProductStatus('active')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently selling</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterProductStatus === 'historic' ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''
          }`}
          onClick={() => setFilterProductStatus('historic')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Archive className="h-4 w-4 text-amber-600" />
              Historic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{statusCounts.historic}</div>
            <p className="text-xs text-muted-foreground mt-1">Legacy SKUs</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterProductStatus === 'discontinued' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' : ''
          }`}
          onClick={() => setFilterProductStatus('discontinued')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-600" />
              Discontinued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statusCounts.discontinued}</div>
            <p className="text-xs text-muted-foreground mt-1">Removed</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterProductStatus === 'all' ? 'ring-2 ring-primary bg-primary/5' : ''
          }`}
          onClick={() => setFilterProductStatus('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total catalog</p>
          </CardContent>
        </Card>
      </div>

      {/* BOM Summary */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">With BOM:</span>
          <span className="font-semibold text-green-600">{summary.productsWithBom}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-muted-foreground">Missing BOM:</span>
          <span className="font-semibold text-amber-600">{summary.productsWithoutBom}</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Total Entries:</span>
          <span className="font-semibold">{summary.totalBomEntries}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {mounted && (
          <>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterBomStatus} onValueChange={setFilterBomStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="BOM Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BOM Status</SelectItem>
                <SelectItem value="with-bom">With BOM</SelectItem>
                <SelectItem value="missing-bom">Missing BOM</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterProductStatus} onValueChange={setFilterProductStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Product Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="historic">Historic Only</SelectItem>
                <SelectItem value="discontinued">Discontinued Only</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Product SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Components</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No products match your search'
                      : 'No products found. Add products in the Product SKUs page first.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isExpanded = expandedProducts.has(product.sku);
                  const productBomEntries = getProductBomEntries(product.sku);

                  return (
                    <React.Fragment key={product.id}>
                      <TableRow
                        className={`cursor-pointer hover:bg-muted/50 ${
                          product.status === 'discontinued' ? 'opacity-50' : ''
                        }`}
                        onClick={() => toggleProductExpanded(product.sku)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{product.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                        </TableCell>
                        <TableCell>
                          {product.brand ? (
                            <Badge variant="outline">{product.brand.code}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">All</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-700 gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : product.status === 'historic' ? (
                            <Badge className="bg-amber-100 text-amber-700 gap-1">
                              <Archive className="h-3 w-3" />
                              Historic
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 gap-1">
                              <XCircle className="h-3 w-3" />
                              Discontinued
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.bomCount > 0 ? (
                            <Badge className="bg-green-100 text-green-700">
                              {product.bomCount} part{product.bomCount !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700">No BOM</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddDialog(product);
                            }}
                            title="Add Component"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded BOM entries */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-8 py-4">
                              {productBomEntries.length === 0 ? (
                                <div className="text-sm text-muted-foreground italic">
                                  No components defined yet.{' '}
                                  <Button
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={() => handleOpenAddDialog(product)}
                                  >
                                    Add the first component
                                  </Button>
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Component</TableHead>
                                      <TableHead>Category</TableHead>
                                      <TableHead className="text-center">Qty</TableHead>
                                      <TableHead>Notes</TableHead>
                                      <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {productBomEntries.map((entry) => {
                                      const stock = getStock(entry.component);
                                      return (
                                        <TableRow key={entry.id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <Layers className="h-4 w-4 text-muted-foreground" />
                                              <div>
                                                <span className="font-mono text-sm">
                                                  {entry.component?.sku || 'Unknown'}
                                                </span>
                                                <div className="text-xs text-muted-foreground">
                                                  {entry.component?.name}
                                                  {entry.component?.variant && (
                                                    <span> - {entry.component.variant}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {entry.component?.category ? (
                                              <Badge variant="outline">
                                                {COMPONENT_CATEGORY_LABELS[
                                                  entry.component.category.name as ComponentCategoryName
                                                ] || entry.component.category.name}
                                              </Badge>
                                            ) : (
                                              <span className="text-muted-foreground">-</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-center font-medium">
                                            {entry.quantity}
                                          </TableCell>
                                          <TableCell>
                                            {entry.notes ? (
                                              <span className="text-sm text-muted-foreground">
                                                {entry.notes}
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">-</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenEditDialog(entry)}
                                                title="Edit"
                                              >
                                                <Edit2 className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteEntry(entry.id)}
                                                title="Remove"
                                              >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              )}
                              <div className="mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAddDialog(product)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Component
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Component Dialog */}
      {mounted && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Component to {selectedProduct?.sku}</DialogTitle>
              <DialogDescription>
                Select a component and specify the quantity needed for this product.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Component *</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Search components..."
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                  />
                  <div className="border rounded-md max-h-[200px] overflow-y-auto">
                    {availableComponents.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        {componentSearch
                          ? 'No components match your search'
                          : 'All components are already in this BOM'}
                      </div>
                    ) : (
                      availableComponents.map((component) => {
                        const stock = getStock(component);
                        const isSelected = formComponentId === component.id;
                        return (
                          <div
                            key={component.id}
                            className={`p-3 cursor-pointer hover:bg-muted border-b last:border-b-0 ${
                              isSelected ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => setFormComponentId(component.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-mono text-sm">{component.sku}</div>
                                <div className="text-xs text-muted-foreground">
                                  {component.name}
                                  {component.variant && ` - ${component.variant}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {component.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {COMPONENT_CATEGORY_LABELS[
                                      component.category.name as ComponentCategoryName
                                    ] || component.category.name}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Stock: {stock?.available ?? 0}
                                </span>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                {selectedComponent && (
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Selected: {selectedComponent.name}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                    onBlur={(e) => {
                      if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                        setFormQuantity(1);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes about this component..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddComponent} disabled={!formComponentId}>
                Add Component
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Entry Dialog */}
      {mounted && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit BOM Entry</DialogTitle>
              <DialogDescription>
                Update quantity or notes for {editingEntry?.component?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                  onBlur={(e) => {
                    if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                      setFormQuantity(1);
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes about this component..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEntry}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Bill of Materials
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            The BOM defines which raw material components are needed to assemble each product.
            This data is essential for inventory forecasting - without it, the system cannot
            calculate component demand from order history.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Products
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Finished goods you sell
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Layers className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Components
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Raw materials needed
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Missing BOM
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Products without BOM are highlighted
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
