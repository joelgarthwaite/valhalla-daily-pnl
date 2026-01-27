'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { subDays } from 'date-fns';
import { Truck, RefreshCw, Download, AlertCircle, Upload, FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ShippingKPIGrid,
  ShippingTrendChart,
  CarrierBreakdownChart,
  ShippingOrdersTable,
} from '@/components/shipping';
import {
  calculateShippingKPIs,
  calculateShippingTrend,
  calculateCarrierBreakdown,
  mergeOrdersWithShipments,
  filterByBrand,
  filterByDateRange,
} from '@/lib/shipping';
import type {
  ShippingOrder,
  Shipment,
  ShippingKPIData,
  ShippingTrendData,
  CarrierBreakdownData,
  ShippingOrderWithShipment,
  DateRange,
} from '@/lib/shipping';

// Filter components - simplified versions for shipping
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type BrandFilter = 'all' | 'DC' | 'BI';

interface ShippingDataMeta {
  ordersCount: number;
  shipmentsCount: number;
  shipmentsWithCost: number;
  shipmentsWithOrderId: number;
}

export default function ShippingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [error, setError] = useState<string | null>(null);
  const [dataMeta, setDataMeta] = useState<ShippingDataMeta | null>(null);

  const [brands, setBrands] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [unmatchedCount, setUnmatchedCount] = useState(0);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString().split('T')[0],
        to: dateRange.to.toISOString().split('T')[0],
        brand: brandFilter,
      });

      const response = await fetch(`/api/shipping/data?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch shipping data');
      }

      const data = await response.json();

      setBrands(data.brands || []);
      setOrders(data.orders || []);
      setShipments(data.shipments || []);
      setDataMeta(data.meta || null);

      // Log data stats for debugging
      console.log('[Shipping Page] Data loaded:', data.meta);
    } catch (err) {
      console.error('Error fetching shipping data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, brandFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch unmatched invoice count
  useEffect(() => {
    const fetchUnmatchedCount = async () => {
      try {
        const response = await fetch('/api/invoices/unmatched?status=pending&limit=1');
        const data = await response.json();
        setUnmatchedCount(data.statusCounts?.pending || 0);
      } catch (error) {
        console.error('Error fetching unmatched count:', error);
      }
    };
    fetchUnmatchedCount();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate metrics
  const { kpiData, trendData, carrierData, tableOrders } = useMemo(() => {
    if (orders.length === 0 && shipments.length === 0) {
      return {
        kpiData: {
          shippingRevenue: 0,
          shippingRevenueChange: 0,
          shippingExpenditure: 0,
          shippingExpenditureChange: 0,
          shippingMargin: 0,
          shippingMarginChange: 0,
          orderCount: 0,
          orderCountChange: 0,
        } as ShippingKPIData,
        trendData: [] as ShippingTrendData[],
        carrierData: [] as CarrierBreakdownData[],
        tableOrders: [] as ShippingOrderWithShipment[],
      };
    }

    // Calculate previous period
    const rangeDays = Math.ceil(
      (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
    );
    const previousFrom = subDays(dateRange.from, rangeDays);
    const previousTo = subDays(dateRange.to, rangeDays);
    const previousRange: DateRange = { from: previousFrom, to: previousTo };

    // Filter by brand (shipments are already filtered by brand in API when brand != 'all')
    const brandFilteredOrders = filterByBrand(orders, brandFilter, brands);
    const brandFilteredShipments = filterByBrand(shipments, brandFilter, brands);

    // Filter orders by date range
    const dateFilteredOrders = filterByDateRange(brandFilteredOrders, dateRange);
    const previousOrders = filterByDateRange(brandFilteredOrders, previousRange);

    // NOTE: We don't filter shipments by shipping_date anymore.
    // Instead, we match shipments to orders by order_id in the calculation functions.
    // This ensures shipping costs are attributed to the order date, not shipment date.

    // Calculate KPIs (pass all shipments - matching happens inside)
    const kpis = calculateShippingKPIs(
      dateFilteredOrders,
      brandFilteredShipments,
      previousOrders
    );

    // Calculate trend (pass all shipments - matching happens inside)
    const trend = calculateShippingTrend(dateFilteredOrders, brandFilteredShipments, dateRange);

    // Calculate carrier breakdown (pass all shipments - matching happens inside)
    const carriers = calculateCarrierBreakdown(dateFilteredOrders, brandFilteredShipments);

    // Merge orders with shipments for table (pass all shipments for matching)
    const merged = mergeOrdersWithShipments(dateFilteredOrders, brandFilteredShipments, brands);

    return {
      kpiData: kpis,
      trendData: trend,
      carrierData: carriers,
      tableOrders: merged,
    };
  }, [orders, shipments, brands, brandFilter, dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Stats Alert (for debugging - can be removed later) */}
      {dataMeta && dataMeta.shipmentsWithCost === 0 && dataMeta.shipmentsCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Shipment data loaded ({dataMeta.shipmentsCount} shipments) but no costs found.
            This may indicate the shipments need carrier invoice uploads to populate costs.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Shipping Analytics
          </h1>
          <p className="text-muted-foreground">
            Carrier costs, margins, and profitability analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/shipping/upload">
            <Button variant="default" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Invoice
            </Button>
          </Link>
          <Link href="/shipping/unmatched">
            <Button variant={unmatchedCount > 0 ? 'destructive' : 'outline'} size="sm">
              <FileQuestion className="h-4 w-4 mr-2" />
              Unmatched
              {unmatchedCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-white text-destructive">
                  {unmatchedCount}
                </Badge>
              )}
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Brand</span>
          <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as BrandFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="DC">Display Champ</SelectItem>
              <SelectItem value="BI">Bright Ivy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Date Range</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
          >
            Last 30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
          >
            Last 90 Days
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <ShippingKPIGrid data={kpiData} />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ShippingTrendChart data={trendData} />
        <CarrierBreakdownChart data={carrierData} />
      </div>

      {/* Orders Table */}
      <ShippingOrdersTable orders={tableOrders} />
    </div>
  );
}
