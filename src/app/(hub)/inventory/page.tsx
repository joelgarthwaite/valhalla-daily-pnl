'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
  RefreshCw,
  Plus,
  Minus,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComponentCategory, Brand, StockLevel, StockStatus, StockAdjustmentType } from '@/types';
import { COMPONENT_CATEGORY_LABELS, STOCK_STATUS_CONFIG, ComponentCategoryName } from '@/types';

interface StockStatusInfo {
  status: StockStatus;
  daysRemaining: number | null;
  velocity: number;
  reorderPoint: number;
  leadTime: number;
  safetyDays: number;
}

interface ComponentWithStock {
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
  stock: StockLevel;
  statusInfo: StockStatusInfo;
}

interface StockSummary {
  total: number;
  ok: number;
  warning: number;
  critical: number;
  outOfStock: number;
  onOrder: number;
}

export default function InventoryPage() {
  const [stockData, setStockData] = useState<ComponentWithStock[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [summary, setSummary] = useState<StockSummary>({
    total: 0,
    ok: 0,
    warning: 0,
    critical: 0,
    outOfStock: 0,
    onOrder: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  // Adjustment modal state
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustingComponent, setAdjustingComponent] = useState<ComponentWithStock | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('count');
  const [adjustmentQty, setAdjustmentQty] = useState<string>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBrand !== 'all') params.set('brand', filterBrand);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const response = await fetch(`/api/inventory/stock?${params}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setStockData(data.stock || []);
      setSummary(data.summary || { total: 0, ok: 0, warning: 0, critical: 0, outOfStock: 0, onOrder: 0 });
      setCategories(data.categories || []);
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load stock data');
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
  }, [filterBrand, filterCategory, filterStatus]);

  // Client-side search filtering
  const filteredData = useMemo(() => {
    if (!searchQuery) return stockData;
    const query = searchQuery.toLowerCase();
    return stockData.filter(
      (item) =>
        item.sku.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.material?.toLowerCase().includes(query)
    );
  }, [stockData, searchQuery]);

  const getStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'out_of_stock':
        return <XCircle className="h-4 w-4 text-red-700" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: StockStatus) => {
    const config = STOCK_STATUS_CONFIG[status];
    return (
      <Badge className={`${config.bgColor} ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const criticalItems = stockData.filter(
    (s) => s.statusInfo.status === 'critical' || s.statusInfo.status === 'out_of_stock'
  );

  const handleOpenAdjustment = (component: ComponentWithStock) => {
    setAdjustingComponent(component);
    setAdjustmentType('count');
    setAdjustmentQty(component.stock.on_hand.toString());
    setAdjustmentNotes('');
    setIsAdjustDialogOpen(true);
  };

  const handleCloseAdjustment = () => {
    setIsAdjustDialogOpen(false);
    setAdjustingComponent(null);
    setAdjustmentQty('');
    setAdjustmentNotes('');
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustingComponent) return;

    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (adjustmentType === 'count' && !adjustmentNotes.trim()) {
      toast.error('Notes are required for stock count adjustments');
      return;
    }

    setIsAdjusting(true);
    try {
      const response = await fetch('/api/inventory/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_id: adjustingComponent.id,
          adjustment_type: adjustmentType,
          quantity: qty,
          notes: adjustmentNotes || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(
        `Stock adjusted: ${data.previousOnHand} → ${data.newOnHand} (${data.adjustment >= 0 ? '+' : ''}${data.adjustment})`
      );
      handleCloseAdjustment();
      fetchData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    } finally {
      setIsAdjusting(false);
    }
  };

  const getPreviewValue = () => {
    if (!adjustingComponent) return null;
    const qty = parseInt(adjustmentQty) || 0;
    const current = adjustingComponent.stock.on_hand;

    switch (adjustmentType) {
      case 'count':
        return { newValue: qty, change: qty - current };
      case 'add':
        return { newValue: current + qty, change: qty };
      case 'remove':
        return { newValue: Math.max(0, current - qty), change: -qty };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stock Levels</h2>
          <p className="text-muted-foreground">
            Monitor inventory levels, velocity, and reorder status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/inventory/components">
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Manage Components
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Banner for Critical Items */}
      {criticalItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  {criticalItems.length} Component{criticalItems.length > 1 ? 's' : ''} Need
                  Attention
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  {criticalItems.map((item) => item.name).join(', ')}
                </p>
              </div>
              <Button size="sm" variant="outline" className="border-red-300 text-red-700">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Active components</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'ok' ? 'ring-2 ring-green-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'ok' ? 'all' : 'ok')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              In Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.ok}</div>
            <p className="text-xs text-muted-foreground mt-1">Healthy levels</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'warning' ? 'ring-2 ring-amber-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'warning' ? 'all' : 'warning')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.warning}</div>
            <p className="text-xs text-muted-foreground mt-1">Monitor closely</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'critical' ? 'ring-2 ring-red-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'critical' ? 'all' : 'critical')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">Reorder now</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              On Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.onOrder}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending delivery</p>
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ok">In Stock</SelectItem>
                <SelectItem value="warning">Low Stock</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">On Hand</TableHead>
                <TableHead className="text-center">Reserved</TableHead>
                <TableHead className="text-center">Available</TableHead>
                <TableHead className="text-center">On Order</TableHead>
                <TableHead className="text-center">Velocity</TableHead>
                <TableHead className="text-center">Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No components match your search'
                      : 'No stock data available. Add components first.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.statusInfo.status)}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="outline">
                          {COMPONENT_CATEGORY_LABELS[item.category.name as ComponentCategoryName] ||
                            item.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.stock.on_hand}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {item.stock.reserved}
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.stock.available}</TableCell>
                    <TableCell className="text-center">
                      {item.stock.on_order > 0 ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {item.stock.on_order}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {item.statusInfo.velocity > 0
                        ? `${item.statusInfo.velocity.toFixed(1)}/day`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.statusInfo.daysRemaining !== null ? (
                        <span
                          className={
                            item.statusInfo.daysRemaining <= item.statusInfo.leadTime
                              ? 'text-red-600 font-medium'
                              : item.statusInfo.daysRemaining <=
                                  item.statusInfo.leadTime + item.statusInfo.safetyDays
                                ? 'text-amber-600'
                                : 'text-green-600'
                          }
                        >
                          {item.statusInfo.daysRemaining}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.statusInfo.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAdjustment(item)}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      {mounted && (
        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
              <DialogDescription>
                {adjustingComponent && (
                  <>
                    Adjusting stock for <strong>{adjustingComponent.name}</strong>
                    <br />
                    <span className="font-mono text-xs">{adjustingComponent.sku}</span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Stock Display */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Current On Hand</span>
                <span className="text-lg font-bold">{adjustingComponent?.stock.on_hand || 0}</span>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={adjustmentType === 'count' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAdjustmentType('count');
                      setAdjustmentQty(adjustingComponent?.stock.on_hand.toString() || '0');
                    }}
                    className="flex items-center gap-1"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Count
                  </Button>
                  <Button
                    variant={adjustmentType === 'add' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAdjustmentType('add');
                      setAdjustmentQty('');
                    }}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                  <Button
                    variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAdjustmentType('remove');
                      setAdjustmentQty('');
                    }}
                    className="flex items-center gap-1"
                  >
                    <Minus className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label>
                  {adjustmentType === 'count'
                    ? 'New Quantity'
                    : adjustmentType === 'add'
                      ? 'Quantity to Add'
                      : 'Quantity to Remove'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder={adjustmentType === 'count' ? 'Enter exact count' : 'Enter quantity'}
                />
              </div>

              {/* Preview */}
              {adjustmentQty && (
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm">New On Hand</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{getPreviewValue()?.newValue}</span>
                    {getPreviewValue() && getPreviewValue()!.change !== 0 && (
                      <Badge
                        variant="outline"
                        className={
                          getPreviewValue()!.change > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {getPreviewValue()!.change > 0 ? '+' : ''}
                        {getPreviewValue()!.change}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>
                  Notes {adjustmentType === 'count' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder={
                    adjustmentType === 'count'
                      ? 'Reason for stock count (required)'
                      : 'Optional notes about this adjustment'
                  }
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseAdjustment} disabled={isAdjusting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAdjustment} disabled={isAdjusting}>
                {isAdjusting ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Understanding Stock Status</CardTitle>
          <CardDescription>
            Stock status is calculated based on current inventory, sales velocity, and lead times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium">In Stock</div>
                <div className="text-xs text-muted-foreground">
                  Sufficient inventory for lead time + safety stock
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium">Low Stock</div>
                <div className="text-xs text-muted-foreground">
                  Will run out within lead time + safety + 7 days
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium">Critical</div>
                <div className="text-xs text-muted-foreground">
                  Will run out within lead time + safety days
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-700 mt-0.5" />
              <div>
                <div className="text-sm font-medium">Out of Stock</div>
                <div className="text-xs text-muted-foreground">No available inventory</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
