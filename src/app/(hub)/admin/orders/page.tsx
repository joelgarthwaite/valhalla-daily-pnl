'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfWeek, subWeeks } from 'date-fns';
import { RefreshCw, Building2, Check, X, ChevronLeft, ChevronRight, CalendarIcon, Globe, Ban, RotateCcw, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Search, Pencil, Hash, Plus } from 'lucide-react';
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
  platform: 'shopify' | 'etsy' | 'b2b';
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
  excluded_at: string | null;
  exclusion_reason: string | null;
  shipping_address: {
    name?: string;
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    country_code?: string;
    zip?: string;
  } | null;
  brand: {
    id: string;
    code: string;
    name: string;
  } | null;
  // Shipping data from shipments table
  shipping_cost: number;
  shipment_count: number;
  carriers: string[];
}

// Common countries for filter
const COUNTRY_OPTIONS = [
  { code: 'all', name: 'All Countries' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NL', name: 'Netherlands' },
];

interface OrdersResponse {
  orders: OrderWithBrand[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

type BrandFilter = 'all' | 'DC' | 'BI';
type PlatformFilter = 'all' | 'shopify' | 'etsy' | 'b2b';
type B2BFilter = 'all' | 'b2b' | 'regular';
type CountryFilter = string; // 'all' or ISO country code
type ExcludedFilter = 'active' | 'excluded' | 'all';

// Sortable columns
type SortColumn = 'order_date' | 'order_number' | 'customer_name' | 'country' | 'brand' | 'platform' | 'subtotal' | 'shipping_cost' | 'is_b2b';
type SortDirection = 'asc' | 'desc';

// Date preset helpers
const getPresetDates = {
  last7: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  last30: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  thisWeek: () => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    return { from: monday, to: now };
  },
  lastWeek: () => {
    const now = new Date();
    const lastMonday = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastSunday = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    return { from: lastMonday, to: lastSunday };
  },
  thisMonth: () => {
    const now = new Date();
    const firstOfMonth = startOfMonth(now);
    return { from: firstOfMonth, to: now };
  },
  ytd: () => {
    const now = new Date();
    return { from: startOfYear(now), to: now };
  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [b2bFilter, setB2BFilter] = useState<B2BFilter>('all');
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [excludedFilter, setExcludedFilter] = useState<ExcludedFilter>('active');
  const [dateFrom, setDateFrom] = useState<Date>(() => subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Exclude dialog
  const [showExcludeDialog, setShowExcludeDialog] = useState(false);
  const [excludeReason, setExcludeReason] = useState('');
  const [pendingExcludeOrderId, setPendingExcludeOrderId] = useState<string | null>(null);

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('order_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Quick date preset handler
  const applyDatePreset = (preset: keyof typeof getPresetDates) => {
    const { from, to } = getPresetDates[preset]();
    setDateFrom(from);
    setDateTo(to);
  };

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

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Order number edit dialog
  const [showOrderNumberDialog, setShowOrderNumberDialog] = useState(false);
  const [pendingOrderNumberEdit, setPendingOrderNumberEdit] = useState<OrderWithBrand | null>(null);
  const [newOrderNumber, setNewOrderNumber] = useState('');

  // New B2B Order dialog
  const [showNewB2BDialog, setShowNewB2BDialog] = useState(false);
  const [isCreatingB2B, setIsCreatingB2B] = useState(false);
  const [b2bFormData, setB2bFormData] = useState({
    brand_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    customer_name: '',
    order_number: '',  // Can be tracking number
    subtotal: '',
    shipping_charged: '',
    city: '',
    country_code: 'GB',
    notes: '',
  });

  // Brands for B2B order form
  const [brands, setBrands] = useState<Array<{ id: string; code: string; name: string }>>([]);

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

      if (countryFilter !== 'all') {
        params.set('country', countryFilter);
      }

      if (b2bFilter === 'b2b') {
        params.set('isB2B', 'true');
      } else if (b2bFilter === 'regular') {
        params.set('isB2B', 'false');
      }

      // Handle excluded filter
      if (excludedFilter === 'excluded') {
        params.set('excludedOnly', 'true');
      } else if (excludedFilter === 'all') {
        params.set('includeExcluded', 'true');
      }
      // 'active' is the default (no params) - only non-excluded orders

      // Add search parameter
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
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
  }, [brandFilter, platformFilter, b2bFilter, excludedFilter, countryFilter, dateFrom, dateTo, offset, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch brands for B2B form - extract from orders data
  useEffect(() => {
    if (orders.length > 0) {
      const brandSet = new Map<string, { id: string; code: string; name: string }>();
      orders.forEach(order => {
        if (order.brand && !brandSet.has(order.brand.id)) {
          brandSet.set(order.brand.id, order.brand);
        }
      });
      if (brandSet.size > 0) {
        setBrands(Array.from(brandSet.values()));
      }
    }
  }, [orders]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [brandFilter, platformFilter, b2bFilter, excludedFilter, countryFilter, dateFrom, dateTo, debouncedSearch]);

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

  const handleExcludeOrder = (order: OrderWithBrand) => {
    setPendingExcludeOrderId(order.id);
    setExcludeReason('Test order');
    setShowExcludeDialog(true);
  };

  const handleConfirmExclude = async () => {
    if (!pendingExcludeOrderId) return;

    try {
      const response = await fetch('/api/orders/exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingExcludeOrderId,
          reason: excludeReason || 'Manually excluded',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to exclude order');
      }

      toast.success(data.message || 'Order excluded');
      setShowExcludeDialog(false);
      setPendingExcludeOrderId(null);
      setExcludeReason('');
      fetchOrders();
    } catch (error) {
      console.error('Error excluding order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to exclude order');
    }
  };

  const handleRestoreOrder = async (order: OrderWithBrand) => {
    try {
      const response = await fetch('/api/orders/exclude', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: order.platform,
          platformOrderId: order.platform_order_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore order');
      }

      toast.success('Order restored - will be included in future syncs');
      fetchOrders();
    } catch (error) {
      console.error('Error restoring order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restore order');
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

  // Create B2B order handler
  const handleCreateB2BOrder = async () => {
    if (!b2bFormData.brand_id || !b2bFormData.customer_name || !b2bFormData.subtotal) {
      toast.error('Please fill in brand, customer name, and subtotal');
      return;
    }

    setIsCreatingB2B(true);
    try {
      const response = await fetch('/api/orders/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: b2bFormData.brand_id,
          order_date: b2bFormData.order_date,
          customer_name: b2bFormData.customer_name,
          order_number: b2bFormData.order_number || null,
          subtotal: parseFloat(b2bFormData.subtotal) || 0,
          shipping_charged: parseFloat(b2bFormData.shipping_charged) || 0,
          shipping_address: b2bFormData.city || b2bFormData.country_code ? {
            city: b2bFormData.city || null,
            country_code: b2bFormData.country_code || null,
          } : null,
          notes: b2bFormData.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create B2B order');
      }

      toast.success('B2B order created successfully');
      setShowNewB2BDialog(false);
      setB2bFormData({
        brand_id: '',
        order_date: format(new Date(), 'yyyy-MM-dd'),
        customer_name: '',
        order_number: '',
        subtotal: '',
        shipping_charged: '',
        city: '',
        country_code: 'GB',
        notes: '',
      });
      fetchOrders();
    } catch (error) {
      console.error('Error creating B2B order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create B2B order');
    } finally {
      setIsCreatingB2B(false);
    }
  };

  // Order number edit handlers
  const handleEditOrderNumber = (order: OrderWithBrand) => {
    setPendingOrderNumberEdit(order);
    setNewOrderNumber(order.order_number || '');
    setShowOrderNumberDialog(true);
  };

  const handleConfirmOrderNumber = async () => {
    if (!pendingOrderNumberEdit) return;

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pendingOrderNumberEdit.id,
          order_number: newOrderNumber.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order number');
      }

      // Update local state
      setOrders(prev => prev.map(o =>
        o.id === pendingOrderNumberEdit.id
          ? { ...o, order_number: newOrderNumber.trim() || null }
          : o
      ));

      toast.success('Order number updated');
      setShowOrderNumberDialog(false);
      setPendingOrderNumberEdit(null);
      setNewOrderNumber('');
    } catch (error) {
      console.error('Error updating order number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order number');
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

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for amounts/dates, ascending for text
      setSortColumn(column);
      setSortDirection(column === 'subtotal' || column === 'shipping_cost' || column === 'order_date' ? 'desc' : 'asc');
    }
  };

  // Sort orders client-side
  const sortedOrders = [...orders].sort((a, b) => {
    let aVal: string | number | boolean;
    let bVal: string | number | boolean;

    switch (sortColumn) {
      case 'order_date':
        aVal = new Date(a.order_date).getTime();
        bVal = new Date(b.order_date).getTime();
        break;
      case 'order_number':
        aVal = (a.order_number || a.platform_order_id).toLowerCase();
        bVal = (b.order_number || b.platform_order_id).toLowerCase();
        break;
      case 'customer_name':
        aVal = (a.customer_name || a.customer_email || '').toLowerCase();
        bVal = (b.customer_name || b.customer_email || '').toLowerCase();
        break;
      case 'country':
        aVal = (a.shipping_address?.country_code || '').toLowerCase();
        bVal = (b.shipping_address?.country_code || '').toLowerCase();
        break;
      case 'brand':
        aVal = (a.brand?.code || '').toLowerCase();
        bVal = (b.brand?.code || '').toLowerCase();
        break;
      case 'platform':
        aVal = a.platform.toLowerCase();
        bVal = b.platform.toLowerCase();
        break;
      case 'subtotal':
        aVal = a.subtotal;
        bVal = b.subtotal;
        break;
      case 'shipping_cost':
        aVal = a.shipping_cost || 0;
        bVal = b.shipping_cost || 0;
        break;
      case 'is_b2b':
        aVal = a.is_b2b ? 1 : 0;
        bVal = b.is_b2b ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Sortable header component
  const SortableHeader = ({ column, children, className }: { column: SortColumn; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn('cursor-pointer select-none hover:bg-muted/50', className)} onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

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
            variant="default"
            onClick={() => setShowNewB2BDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New B2B Order
          </Button>
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, names, addresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[280px] pl-8"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

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
                  <div className="flex">
                    {/* Quick presets */}
                    <div className="border-r p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Quick Select</p>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => { applyDatePreset('last7'); setIsCalendarOpen(false); }}>Last 7 Days</Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => { applyDatePreset('thisWeek'); setIsCalendarOpen(false); }}>This Week</Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => { applyDatePreset('lastWeek'); setIsCalendarOpen(false); }}>Last Week</Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => { applyDatePreset('thisMonth'); setIsCalendarOpen(false); }}>This Month</Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => { applyDatePreset('last30'); setIsCalendarOpen(false); }}>Last 30 Days</Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => { applyDatePreset('ytd'); setIsCalendarOpen(false); }}>Year to Date</Button>
                    </div>
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
                  </div>
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
                  <SelectItem value="b2b">B2B</SelectItem>
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

            {/* Country Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4 inline mr-1" />
                Country
              </Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Excluded Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Status
              </Label>
              <Select value={excludedFilter} onValueChange={(v) => setExcludedFilter(v as ExcludedFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="excluded">Excluded Only</SelectItem>
                  <SelectItem value="all">All Orders</SelectItem>
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
                <SortableHeader column="order_date">Date</SortableHeader>
                <SortableHeader column="order_number">Order #</SortableHeader>
                <SortableHeader column="customer_name">Customer</SortableHeader>
                <SortableHeader column="country">Country</SortableHeader>
                <SortableHeader column="brand">Brand</SortableHeader>
                <SortableHeader column="platform">Platform</SortableHeader>
                <SortableHeader column="subtotal" className="text-right">Amount</SortableHeader>
                <SortableHeader column="shipping_cost" className="text-right">Ship Cost</SortableHeader>
                <SortableHeader column="is_b2b" className="text-center">B2B</SortableHeader>
                <TableHead>B2B Customer</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No orders found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className={cn(
                      order.is_b2b && 'bg-amber-50/50',
                      order.excluded_at && 'bg-red-50/50 opacity-60'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={(checked: boolean | 'indeterminate') => handleSelectOrder(order.id, !!checked)}
                        aria-label={`Select order ${order.order_number}`}
                        disabled={!!order.excluded_at}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {format(new Date(order.order_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn(!order.order_number && 'text-muted-foreground')}>
                          {order.order_number || order.platform_order_id.slice(0, 10)}
                        </span>
                        {!order.excluded_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                            onClick={() => handleEditOrderNumber(order)}
                            title="Edit order number"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {order.excluded_at && (
                          <Badge variant="destructive" className="text-xs">
                            <Ban className="h-3 w-3 mr-1" />
                            Excluded
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {order.customer_name || order.customer_email || '-'}
                    </TableCell>
                    <TableCell>
                      {order.shipping_address?.country_code || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.brand?.code || '?'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.platform === 'shopify' ? 'default' : 'secondary'}
                        className={cn(
                          order.platform === 'shopify' && 'bg-green-600',
                          order.platform === 'etsy' && 'bg-orange-500',
                          order.platform === 'b2b' && 'bg-blue-600'
                        )}
                      >
                        {order.platform === 'b2b' ? 'B2B' : order.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(order.subtotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {order.shipping_cost > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className={order.shipping_cost > 0 ? '' : 'text-muted-foreground'}>
                            {formatCurrency(order.shipping_cost)}
                          </span>
                          {order.shipment_count > 1 && (
                            <span className="text-xs text-muted-foreground">({order.shipment_count})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!order.excluded_at ? (
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
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {order.excluded_at ? (
                        <span className="text-xs text-red-600" title={order.exclusion_reason || ''}>
                          {order.exclusion_reason || 'Excluded'}
                        </span>
                      ) : (
                        order.b2b_customer_name || '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {order.excluded_at ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleRestoreOrder(order)}
                          title="Restore this order"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleExcludeOrder(order)}
                          title="Exclude this order from P&L"
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Exclude
                        </Button>
                      )}
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

      {/* Exclude Order Dialog */}
      <Dialog open={showExcludeDialog} onOpenChange={(open) => {
        if (!open) {
          setShowExcludeDialog(false);
          setPendingExcludeOrderId(null);
          setExcludeReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              <AlertTriangle className="h-5 w-5 inline mr-2" />
              Exclude Order from P&L
            </DialogTitle>
            <DialogDescription>
              This order will be permanently excluded from all P&L calculations. It will also be
              skipped during future syncs, so it won&apos;t reappear.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <strong>Warning:</strong> Excluded orders are not deleted - they remain in the database
              but are hidden from P&L reports. You can restore them later if needed.
            </div>
            <div>
              <Label htmlFor="exclude-reason">Reason for exclusion</Label>
              <Input
                id="exclude-reason"
                value={excludeReason}
                onChange={(e) => setExcludeReason(e.target.value)}
                placeholder="e.g., Test order, Duplicate, Internal order"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExcludeDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirmExclude}
              variant="destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Exclude Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Number Edit Dialog */}
      <Dialog open={showOrderNumberDialog} onOpenChange={(open) => {
        if (!open) {
          setShowOrderNumberDialog(false);
          setPendingOrderNumberEdit(null);
          setNewOrderNumber('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Hash className="h-5 w-5 inline mr-2" />
              Edit Order Number
            </DialogTitle>
            <DialogDescription>
              Set a custom order number for this order. This is useful for B2B orders imported from
              CSV that need to be linked to shipments by tracking number.
            </DialogDescription>
          </DialogHeader>

          {pendingOrderNumberEdit && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{pendingOrderNumberEdit.customer_name || pendingOrderNumberEdit.b2b_customer_name || '-'}</span>
                </div>
                {pendingOrderNumberEdit.shipping_address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right text-xs">
                      {[
                        pendingOrderNumberEdit.shipping_address.city,
                        pendingOrderNumberEdit.shipping_address.country_code
                      ].filter(Boolean).join(', ') || '-'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform ID:</span>
                  <span className="font-mono text-xs">{pendingOrderNumberEdit.platform_order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{format(new Date(pendingOrderNumberEdit.order_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{formatCurrency(pendingOrderNumberEdit.subtotal)}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="order-number">Order Number / Tracking Reference</Label>
                <Input
                  id="order-number"
                  value={newOrderNumber}
                  onChange={(e) => setNewOrderNumber(e.target.value)}
                  placeholder="e.g., B2B-2024-001 or 1872335441"
                  className="mt-2 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For B2B orders, this can be a tracking number to match with shipments
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderNumberDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleConfirmOrderNumber}>
              <Check className="h-4 w-4 mr-2" />
              Save Order Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New B2B Order Dialog */}
      <Dialog open={showNewB2BDialog} onOpenChange={(open) => {
        if (!open) {
          setShowNewB2BDialog(false);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Plus className="h-5 w-5 inline mr-2 text-blue-600" />
              New B2B Order
            </DialogTitle>
            <DialogDescription>
              Create a B2B order that can be linked to shipments via tracking number.
              This will be included in P&L calculations.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="b2b-brand">Brand *</Label>
                <Select
                  value={b2bFormData.brand_id}
                  onValueChange={(v) => setB2bFormData(prev => ({ ...prev, brand_id: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="b2b-date">Order Date *</Label>
                <Input
                  id="b2b-date"
                  type="date"
                  value={b2bFormData.order_date}
                  onChange={(e) => setB2bFormData(prev => ({ ...prev, order_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="b2b-customer">Customer Name *</Label>
              <Input
                id="b2b-customer"
                value={b2bFormData.customer_name}
                onChange={(e) => setB2bFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="e.g., DP World Tour Dubai"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="b2b-order-number">Order # / Tracking Number</Label>
              <Input
                id="b2b-order-number"
                value={b2bFormData.order_number}
                onChange={(e) => setB2bFormData(prev => ({ ...prev, order_number: e.target.value }))}
                placeholder="e.g., 1872335441"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter tracking number to link with shipments
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="b2b-subtotal">Subtotal (£) *</Label>
                <Input
                  id="b2b-subtotal"
                  type="number"
                  step="0.01"
                  value={b2bFormData.subtotal}
                  onChange={(e) => setB2bFormData(prev => ({ ...prev, subtotal: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="b2b-shipping">Shipping Charged (£)</Label>
                <Input
                  id="b2b-shipping"
                  type="number"
                  step="0.01"
                  value={b2bFormData.shipping_charged}
                  onChange={(e) => setB2bFormData(prev => ({ ...prev, shipping_charged: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="b2b-city">City</Label>
                <Input
                  id="b2b-city"
                  value={b2bFormData.city}
                  onChange={(e) => setB2bFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="e.g., Dubai"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="b2b-country">Country Code</Label>
                <Input
                  id="b2b-country"
                  value={b2bFormData.country_code}
                  onChange={(e) => setB2bFormData(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., AE"
                  maxLength={2}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="b2b-notes">Notes</Label>
              <Input
                id="b2b-notes"
                value={b2bFormData.notes}
                onChange={(e) => setB2bFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this order"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewB2BDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreateB2BOrder}
              disabled={isCreatingB2B}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingB2B ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create B2B Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
