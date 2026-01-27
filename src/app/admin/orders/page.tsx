'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { RefreshCw, Building2, Check, X, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/pnl/targets';

interface OrderWithBrand {
  id: string;
  platform: 'shopify' | 'etsy';
  platform_order_id: string;
  order_number: string | null;
  order_date: string;
  customer_name: string | null;
  customer_email: string | null;
  brand_id: string;
  subtotal: number;
  total: number;
  is_b2b: boolean;
  b2b_customer_name: string | null;
  status: string | null;
  fulfillment_status: string | null;
  brand: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface OrdersResponse {
  orders: OrderWithBrand[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

type BrandFilter = 'all' | 'DC' | 'BI';
type PlatformFilter = 'all' | 'shopify' | 'etsy';
type B2BFilter = 'all' | 'b2b' | 'regular';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [b2bFilter, setB2BFilter] = useState<B2BFilter>('all');
  const [dateFrom, setDateFrom] = useState<Date>(() => subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // B2B tagging dialog
  const [showB2BDialog, setShowB2BDialog] = useState(false);
  const [b2bCustomerName, setB2BCustomerName] = useState('');
  const [pendingB2BOrderId, setPendingB2BOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        from: format(dateFrom, 'yyyy-MM-dd'),
        to: format(dateTo, 'yyyy-MM-dd'),
        brand: brandFilter,
        platform: platformFilter,
        limit: String(limit),
        offset: String(offset),
      });

      if (b2bFilter === 'b2b') {
        params.set('isB2B', 'true');
      } else if (b2bFilter === 'regular') {
        params.set('isB2B', 'false');
      }

      const response = await fetch(`/api/orders?${params}`);
      const data: OrdersResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as unknown as { error: string }).error || 'Failed to fetch orders');
      }

      setOrders(data.orders);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [brandFilter, platformFilter, b2bFilter, dateFrom, dateTo, offset]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [brandFilter, platformFilter, b2bFilter, dateFrom, dateTo]);

  const handleToggleB2B = async (order: OrderWithBrand) => {
    if (!order.is_b2b) {
      // Opening B2B dialog to get customer name
      setPendingB2BOrderId(order.id);
      setB2BCustomerName(order.customer_name || '');
      setShowB2BDialog(true);
    } else {
      // Unmarking as B2B - do it immediately
      await updateOrderB2B(order.id, false, null);
    }
  };

  const handleConfirmB2B = async () => {
    if (!pendingB2BOrderId) return;

    await updateOrderB2B(pendingB2BOrderId, true, b2bCustomerName || null);
    setShowB2BDialog(false);
    setPendingB2BOrderId(null);
    setB2BCustomerName('');
  };

  const updateOrderB2B = async (orderId: string, isB2B: boolean, customerName: string | null) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          is_b2b: isB2B,
          b2b_customer_name: customerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      // Update local state
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, is_b2b: isB2B, b2b_customer_name: customerName }
          : o
      ));

      toast.success(isB2B ? 'Order marked as B2B' : 'Order unmarked as B2B');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  const handleBulkMarkB2B = async () => {
    if (selectedIds.size === 0) return;

    setB2BCustomerName('');
    setShowB2BDialog(true);
  };

  const handleConfirmBulkB2B = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedIds),
          is_b2b: true,
          b2b_customer_name: b2bCustomerName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update orders');
      }

      toast.success(`${data.updatedCount} orders marked as B2B`);
      setShowB2BDialog(false);
      setB2BCustomerName('');
      setPendingB2BOrderId(null);
      fetchOrders();
    } catch (error) {
      console.error('Error bulk updating orders:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update orders');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(orders.map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === orders.length);
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Orders</h2>
          <p className="text-muted-foreground">
            View and manage orders. Tag Shopify orders as B2B.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="default"
              onClick={handleBulkMarkB2B}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Mark {selectedIds.size} as B2B
            </Button>
          )}
          <Button
            variant="outline"
            onClick={fetchOrders}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Date Range
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[260px] justify-start text-left font-normal'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, 'LLL dd, y')} - {format(dateTo, 'LLL dd, y')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateFrom}
                    selected={{ from: dateFrom, to: dateTo }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateFrom(range.from);
                        setDateTo(range.to);
                        setIsCalendarOpen(false);
                      } else if (range?.from) {
                        setDateFrom(range.from);
                        setDateTo(range.from);
                      }
                    }}
                    numberOfMonths={2}
                    weekStartsOn={1}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Brand Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Brand
              </Label>
              <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as BrandFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="DC">Display Champ</SelectItem>
                  <SelectItem value="BI">Bright Ivy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Platform
              </Label>
              <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="etsy">Etsy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* B2B Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Type
              </Label>
              <Select value={b2bFilter} onValueChange={(v) => setB2BFilter(v as B2BFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="b2b">B2B Only</SelectItem>
                  <SelectItem value="regular">Regular Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              {total} orders found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all orders"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">B2B</TableHead>
                <TableHead>B2B Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No orders found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className={order.is_b2b ? 'bg-amber-50/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={(checked: boolean | 'indeterminate') => handleSelectOrder(order.id, !!checked)}
                        aria-label={`Select order ${order.order_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {format(new Date(order.order_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {order.order_number || order.platform_order_id.slice(0, 10)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {order.customer_name || order.customer_email || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.brand?.code || '?'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.platform === 'shopify' ? 'default' : 'secondary'}
                        className={order.platform === 'shopify' ? 'bg-green-600' : 'bg-orange-500'}
                      >
                        {order.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(order.subtotal)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={order.is_b2b ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'h-7 w-7 p-0',
                          order.is_b2b && 'bg-amber-500 hover:bg-amber-600'
                        )}
                        onClick={() => handleToggleB2B(order)}
                        title={order.is_b2b ? 'Click to remove B2B tag' : 'Click to mark as B2B'}
                      >
                        {order.is_b2b ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {order.b2b_customer_name || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setOffset(offset + limit)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* B2B Customer Name Dialog */}
      <Dialog open={showB2BDialog} onOpenChange={(open) => {
        if (!open) {
          setShowB2BDialog(false);
          setPendingB2BOrderId(null);
          setB2BCustomerName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Building2 className="h-5 w-5 inline mr-2" />
              Mark as B2B Order
            </DialogTitle>
            <DialogDescription>
              {pendingB2BOrderId
                ? 'Optionally enter a B2B customer name for this order.'
                : `Mark ${selectedIds.size} order(s) as B2B. Optionally enter a customer name.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="b2b-customer">B2B Customer Name (optional)</Label>
            <Input
              id="b2b-customer"
              value={b2bCustomerName}
              onChange={(e) => setB2BCustomerName(e.target.value)}
              placeholder="e.g., ACME Corp, Golf Pro Shop"
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowB2BDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={pendingB2BOrderId ? handleConfirmB2B : handleConfirmBulkB2B}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as B2B
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
