'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Tag, Search, ShoppingCart, Archive, XCircle, Store } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import type { Brand, ProductSkuFormData, ProductSkuStatus } from '@/types';

interface ProductSkuWithBrand {
  id: string;
  sku: string;
  name: string;
  brand_id: string | null;
  status: ProductSkuStatus;
  platforms: string[];
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  brand: Brand | null;
}

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: ShoppingCart,
    description: 'Currently available for purchase',
  },
  historic: {
    label: 'Historic',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: Archive,
    description: 'Was sold before, kept for forecasting',
  },
  discontinued: {
    label: 'Discontinued',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: XCircle,
    description: 'Permanently removed, won\'t return',
  },
};

const PLATFORM_OPTIONS = [
  { value: 'shopify', label: 'Shopify' },
  { value: 'etsy', label: 'Etsy' },
];

export default function ProductSkusPage() {
  const [productSkus, setProductSkus] = useState<ProductSkuWithBrand[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [statusCounts, setStatusCounts] = useState({ active: 0, historic: 0, discontinued: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProductSkuFormData>({
    sku: '',
    name: '',
    brand_id: '',
    status: 'active',
    platforms: [],
    description: '',
    notes: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBrand !== 'all') params.set('brand', filterBrand);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterPlatform !== 'all') params.set('platform', filterPlatform);

      const response = await fetch(`/api/inventory/product-skus?${params}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setProductSkus(data.productSkus || []);
      setBrands(data.brands || []);
      setStatusCounts(data.statusCounts || { active: 0, historic: 0, discontinued: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load product SKUs');
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
  }, [filterBrand, filterStatus, filterPlatform]);

  // Filtered product SKUs (client-side search)
  const filteredProductSkus = useMemo(() => {
    if (!searchQuery) return productSkus;
    const query = searchQuery.toLowerCase();
    return productSkus.filter(
      (p) =>
        p.sku.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query)
    );
  }, [productSkus, searchQuery]);

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      brand_id: '',
      status: 'active',
      platforms: [],
      description: '',
      notes: '',
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
        status: formData.status,
        platforms: formData.platforms,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      };

      const url = editingId
        ? `/api/inventory/product-skus/${editingId}`
        : '/api/inventory/product-skus';
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

      toast.success(editingId ? 'Product SKU updated' : 'Product SKU added');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving product SKU:', error);
      toast.error('Failed to save product SKU');
    }
  };

  const handleEdit = (productSku: ProductSkuWithBrand) => {
    setFormData({
      brand_id: productSku.brand_id || '',
      sku: productSku.sku,
      name: productSku.name,
      status: productSku.status,
      platforms: productSku.platforms || [],
      description: productSku.description || '',
      notes: productSku.notes || '',
    });
    setEditingId(productSku.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product SKU?')) return;

    try {
      const response = await fetch(`/api/inventory/product-skus/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Product SKU deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting product SKU:', error);
      toast.error('Failed to delete product SKU');
    }
  };

  const getStatusBadge = (status: ProductSkuStatus) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const togglePlatform = (platform: string) => {
    const current = formData.platforms || [];
    const newPlatforms = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    setFormData({ ...formData, platforms: newPlatforms });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product SKUs</h2>
          <p className="text-muted-foreground">
            Master catalog of all product SKUs - active, historic, and discontinued
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
                Add Product SKU
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Product SKU</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Update product SKU details' : 'Add a new product SKU to the master catalog'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU Code *</Label>
                    <Input
                      placeholder="e.g., GBCPRESTIGEOAK"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
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
                  <Label>Product Name *</Label>
                  <Input
                    placeholder="e.g., Prestige Oak Golf Ball Display Case"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as ProductSkuStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {STATUS_CONFIG[formData.status || 'active'].description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="space-y-2 pt-1">
                      {PLATFORM_OPTIONS.map((platform) => (
                        <div key={platform.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`platform-${platform.value}`}
                            checked={(formData.platforms || []).includes(platform.value)}
                            onCheckedChange={() => togglePlatform(platform.value)}
                            disabled={formData.status !== 'active'}
                          />
                          <Label
                            htmlFor={`platform-${platform.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {platform.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {formData.status !== 'active' && (
                      <p className="text-xs text-muted-foreground">
                        Only active SKUs can have platforms
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Product description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Internal notes (e.g., why discontinued, merged from which SKU)..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingId ? 'Update' : 'Add'} Product SKU
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Product SKU
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Product SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In master catalog
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available for purchase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Archive className="h-4 w-4 text-amber-600" />
              Historic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{statusCounts.historic}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Kept for forecasting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-600" />
              Discontinued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statusCounts.discontinued}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently removed
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
              placeholder="Search SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {mounted && (
          <>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="historic">Historic</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
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

            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="shopify">Shopify</SelectItem>
                <SelectItem value="etsy">Etsy</SelectItem>
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
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProductSkus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No product SKUs match your search'
                      : 'No product SKUs yet. Click "Add Product SKU" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductSkus.map((productSku) => (
                  <TableRow
                    key={productSku.id}
                    className={productSku.status === 'discontinued' ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{productSku.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{productSku.name}</div>
                      {productSku.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {productSku.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {productSku.brand ? (
                        <Badge variant="outline">{productSku.brand.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">All</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(productSku.status)}</TableCell>
                    <TableCell>
                      {productSku.platforms && productSku.platforms.length > 0 ? (
                        <div className="flex gap-1">
                          {productSku.platforms.map((platform) => (
                            <Badge key={platform} variant="secondary" className="text-xs">
                              <Store className="h-3 w-3 mr-1" />
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(productSku)}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(productSku.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Product SKUs
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Product SKUs are the canonical identifiers for products you sell. This master catalog helps
            track which SKUs are currently available vs historic (no longer sold but needed for forecasting).
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <ShoppingCart className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Active</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Currently purchasable on platforms
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Archive className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Historic</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  No longer sold, but sales data used for forecasting
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Discontinued</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Permanently removed, won't return
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
