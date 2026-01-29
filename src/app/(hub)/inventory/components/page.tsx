'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Package, Search, Box, Layers } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { ComponentCategory, Brand, StockLevel, ComponentFormData } from '@/types';
import { COMPONENT_CATEGORY_LABELS, STOCK_STATUS_CONFIG, ComponentCategoryName } from '@/types';

interface ComponentWithRelations {
  id: string;
  brand_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  material: string | null;
  variant: string | null;
  safety_stock_days: number;
  min_order_qty: number;
  lead_time_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: ComponentCategory | null;
  brand: Brand | null;
  // Supabase returns object for one-to-one (UNIQUE) relationships, array for one-to-many
  stock: StockLevel[] | StockLevel | null;
}

// Helper to get stock level from component (handles both array and object responses)
function getStock(component: ComponentWithRelations): StockLevel | null {
  if (!component.stock) return null;
  // Handle both array (legacy) and object (one-to-one) responses
  return Array.isArray(component.stock) ? component.stock[0] : component.stock;
}

export default function ComponentsPage() {
  const [components, setComponents] = useState<ComponentWithRelations[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('true');
  const [mounted, setMounted] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ComponentFormData>({
    brand_id: '',
    sku: '',
    name: '',
    description: '',
    category_id: '',
    material: '',
    variant: '',
    safety_stock_days: 14,
    min_order_qty: 1,
    lead_time_days: undefined,
    is_active: true,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBrand !== 'all') params.set('brand', filterBrand);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      // Always send the active filter - API defaults to 'true' if not sent
      params.set('active', filterActive);

      const response = await fetch(`/api/inventory/components?${params}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setComponents(data.components || []);
      setCategories(data.categories || []);
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load components');
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
  }, [filterBrand, filterCategory, filterActive]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const activeComponents = components.filter((c) => c.is_active);
    const withStock = activeComponents.filter((c) => {
      const stock = getStock(c);
      return stock && stock.on_hand > 0;
    });
    const lowStock = activeComponents.filter((c) => {
      const stock = getStock(c);
      if (!stock || stock.available === undefined || stock.available === null) return false;
      return stock.available < 10 && stock.available > 0;
    });
    const outOfStock = activeComponents.filter((c) => {
      const stock = getStock(c);
      if (!stock || stock.available === undefined || stock.available === null) return true;
      return stock.available <= 0;
    });

    const byCategory = categories.reduce(
      (acc, cat) => {
        acc[cat.name] = components.filter((c) => c.category_id === cat.id).length;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: components.length,
      active: activeComponents.length,
      withStock: withStock.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      byCategory,
    };
  }, [components, categories]);

  // Filtered components (client-side search)
  const filteredComponents = useMemo(() => {
    if (!searchQuery) return components;
    const query = searchQuery.toLowerCase();
    return components.filter(
      (c) =>
        c.sku.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.material?.toLowerCase().includes(query)
    );
  }, [components, searchQuery]);

  const resetForm = () => {
    setFormData({
      brand_id: '',
      sku: '',
      name: '',
      description: '',
      category_id: '',
      material: '',
      variant: '',
      safety_stock_days: 14,
      min_order_qty: 1,
      lead_time_days: undefined,
      is_active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.sku || !formData.name) {
      toast.error('Please fill in required fields (SKU and Name)');
      return;
    }

    try {
      const payload = {
        brand_id: formData.brand_id || undefined,
        sku: formData.sku,
        name: formData.name,
        description: formData.description || undefined,
        category_id: formData.category_id || undefined,
        material: formData.material || undefined,
        variant: formData.variant || undefined,
        safety_stock_days: formData.safety_stock_days,
        min_order_qty: formData.min_order_qty,
        lead_time_days: formData.lead_time_days || undefined,
        is_active: formData.is_active,
      };

      const url = editingId
        ? `/api/inventory/components/${editingId}`
        : '/api/inventory/components';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(editingId ? 'Component updated' : 'Component added');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving component:', error);
      toast.error('Failed to save component');
    }
  };

  const handleEdit = (component: ComponentWithRelations) => {
    setFormData({
      brand_id: component.brand_id || '',
      sku: component.sku,
      name: component.name,
      description: component.description || '',
      category_id: component.category_id || '',
      material: component.material || '',
      variant: component.variant || '',
      safety_stock_days: component.safety_stock_days,
      min_order_qty: component.min_order_qty,
      lead_time_days: component.lead_time_days || undefined,
      is_active: component.is_active,
    });
    setEditingId(component.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this component?')) return;

    try {
      const response = await fetch(`/api/inventory/components/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Component deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting component:', error);
      toast.error('Failed to delete component');
    }
  };

  const getStockLevel = (component: ComponentWithRelations): StockLevel | null => {
    return getStock(component);
  };

  const getStockBadge = (stock: StockLevel | null) => {
    if (!stock || stock.available === undefined || stock.available === null) {
      return (
        <Badge className="bg-gray-100 text-gray-700">
          No Stock Record
        </Badge>
      );
    }

    if (stock.available <= 0) {
      const config = STOCK_STATUS_CONFIG.out_of_stock;
      return (
        <Badge className={`${config.bgColor} ${config.color}`}>
          {config.label}
        </Badge>
      );
    }

    if (stock.available < 10) {
      const config = STOCK_STATUS_CONFIG.warning;
      return (
        <Badge className={`${config.bgColor} ${config.color}`}>
          {config.label}
        </Badge>
      );
    }

    const config = STOCK_STATUS_CONFIG.ok;
    return (
      <Badge className={`${config.bgColor} ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Components</h2>
          <p className="text-muted-foreground">
            Manage inventory components, materials, and reorder settings
          </p>
        </div>
        {mounted ? (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Component
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Component</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Update component details' : 'Add a new inventory component'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input
                      placeholder="e.g., CASE-OAK-LRG"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Select
                      value={formData.brand_id || 'all'}
                      onValueChange={(v) => setFormData({ ...formData, brand_id: v === 'all' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Brands" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Oak Display Case Large"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category_id || 'none'}
                      onValueChange={(v) => setFormData({ ...formData, category_id: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {COMPONENT_CATEGORY_LABELS[cat.name as ComponentCategoryName] || cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <Input
                      placeholder="e.g., Oak, Walnut, Acrylic"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Variant</Label>
                    <Input
                      placeholder="e.g., Small, Large, Personalized"
                      value={formData.variant}
                      onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 flex items-end gap-2">
                    <Switch
                      id="is-active"
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label htmlFor="is-active">Active</Label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Safety Stock (days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.safety_stock_days}
                      onChange={(e) =>
                        setFormData({ ...formData, safety_stock_days: parseInt(e.target.value) || 14 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Order Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.min_order_qty}
                      onChange={(e) =>
                        setFormData({ ...formData, min_order_qty: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lead Time (days)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="From supplier"
                      value={formData.lead_time_days || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lead_time_days: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Additional details about this component..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingId ? 'Update' : 'Add'} Component
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Component
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.withStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Components with inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.outOfStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need reorder
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU, name, or material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {mounted && (
          <>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {COMPONENT_CATEGORY_LABELS[cat.name as ComponentCategoryName] || cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Component Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Components</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-center">On Hand</TableHead>
                <TableHead className="text-center">Available</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredComponents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No components match your search'
                      : 'No components yet. Click "Add Component" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredComponents.map((component) => {
                  const stock = getStockLevel(component);

                  return (
                    <TableRow key={component.id} className={!component.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{component.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{component.name}</span>
                          {!component.is_active && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {component.variant && (
                          <div className="text-xs text-muted-foreground">{component.variant}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {component.category ? (
                          <Badge variant="outline">
                            {COMPONENT_CATEGORY_LABELS[component.category.name as ComponentCategoryName] ||
                              component.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {component.material || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {stock ? stock.on_hand : '-'}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {stock ? stock.available : '-'}
                      </TableCell>
                      <TableCell>{getStockBadge(stock)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(component)}
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(component.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Components
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Components are the building blocks of your products. Each product you sell is made up of
            one or more components defined in the Bill of Materials (BOM).
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <Box className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Categories</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Cases, Bases, Accessories, Packaging
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Layers className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Safety Stock</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Days of buffer inventory to maintain
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Lead Time</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Days to receive from supplier
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
