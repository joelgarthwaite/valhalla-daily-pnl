'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { RefreshCw, CheckCircle, AlertCircle, Store, ShoppingBag, Database } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PlatformStatus {
  platform: string;
  configuredStores: number;
  stores: Array<{
    brand: string;
    configured: boolean;
    domain?: string;
    shopId?: string;
    status?: string;
    error?: string;
  }>;
}

interface SyncResult {
  platform?: string;
  brand: string;
  recordsSynced: number;
  errors: string[];
  dateRange: { start: string; end: string };
}

export default function OrderSyncPage() {
  const [shopifyStatus, setShopifyStatus] = useState<PlatformStatus | null>(null);
  const [etsyStatus, setEtsyStatus] = useState<PlatformStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<{
    shopify: boolean;
    etsy: boolean;
    all: boolean;
  }>({ shopify: false, etsy: false, all: false });

  const [lastSyncResults, setLastSyncResults] = useState<SyncResult[] | null>(null);

  // Date range state
  const [syncDays, setSyncDays] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [useCustomRange, setUseCustomRange] = useState(false);

  // Refresh P&L state
  const [isRefreshingPnL, setIsRefreshingPnL] = useState(false);

  useEffect(() => {
    fetchPlatformStatus();
  }, []);

  const fetchPlatformStatus = async () => {
    setIsLoading(true);
    try {
      const [shopifyRes, etsyRes] = await Promise.all([
        fetch('/api/shopify/sync'),
        fetch('/api/etsy/sync'),
      ]);

      const [shopifyData, etsyData] = await Promise.all([
        shopifyRes.json(),
        etsyRes.json(),
      ]);

      setShopifyStatus(shopifyData);
      setEtsyStatus(etsyData);
    } catch (error) {
      console.error('Error fetching platform status:', error);
      toast.error('Failed to load platform status');
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = () => {
    if (useCustomRange && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), parseInt(syncDays)), 'yyyy-MM-dd');
    return { startDate, endDate };
  };

  const handleShopifySync = async () => {
    setIsSyncing((prev) => ({ ...prev, shopify: true }));
    setLastSyncResults(null);

    try {
      const { startDate, endDate } = getDateRange();

      const response = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setLastSyncResults(data.results.map((r: SyncResult) => ({ ...r, platform: 'shopify' })));

      const totalRecords = data.results.reduce(
        (sum: number, r: SyncResult) => sum + r.recordsSynced,
        0
      );
      toast.success(`Synced ${totalRecords} orders from Shopify`);
      fetchPlatformStatus();
    } catch (error) {
      console.error('Error syncing Shopify:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync Shopify');
    } finally {
      setIsSyncing((prev) => ({ ...prev, shopify: false }));
    }
  };

  const handleEtsySync = async () => {
    setIsSyncing((prev) => ({ ...prev, etsy: true }));
    setLastSyncResults(null);

    try {
      const { startDate, endDate } = getDateRange();

      const response = await fetch('/api/etsy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setLastSyncResults(data.results.map((r: SyncResult) => ({ ...r, platform: 'etsy' })));

      const totalRecords = data.results.reduce(
        (sum: number, r: SyncResult) => sum + r.recordsSynced,
        0
      );
      toast.success(`Synced ${totalRecords} orders from Etsy`);
      fetchPlatformStatus();
    } catch (error) {
      console.error('Error syncing Etsy:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync Etsy');
    } finally {
      setIsSyncing((prev) => ({ ...prev, etsy: false }));
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing((prev) => ({ ...prev, all: true }));
    setLastSyncResults(null);

    try {
      const { startDate, endDate } = getDateRange();

      const response = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setLastSyncResults(data.results);

      const totalRecords = data.results.reduce(
        (sum: number, r: SyncResult) => sum + r.recordsSynced,
        0
      );
      toast.success(`Synced ${totalRecords} orders from all platforms`);
      fetchPlatformStatus();
    } catch (error) {
      console.error('Error syncing all:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync orders');
    } finally {
      setIsSyncing((prev) => ({ ...prev, all: false }));
    }
  };

  // Combined sync + P&L refresh in one action
  const [syncStep, setSyncStep] = useState<'idle' | 'syncing' | 'refreshing' | 'done'>('idle');

  const handleSyncAndUpdate = async () => {
    setSyncStep('syncing');
    setLastSyncResults(null);

    try {
      const { startDate, endDate } = getDateRange();

      // Step 1: Sync orders
      const syncResponse = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(syncData.error || 'Sync failed');
      }

      setLastSyncResults(syncData.results);
      const totalRecords = syncData.results.reduce(
        (sum: number, r: SyncResult) => sum + r.recordsSynced,
        0
      );

      // Step 2: Refresh P&L
      setSyncStep('refreshing');

      const refreshResponse = await fetch('/api/pnl/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: parseInt(syncDays) || 90 }),
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok) {
        // Sync succeeded but refresh failed - still show partial success
        toast.warning(`Synced ${totalRecords} orders, but P&L refresh failed. Try clicking "Refresh P&L" manually.`);
        setSyncStep('idle');
        return;
      }

      setSyncStep('done');
      toast.success(`Done! Synced ${totalRecords} orders and updated dashboard.`);
      fetchPlatformStatus();

      // Reset to idle after showing success
      setTimeout(() => setSyncStep('idle'), 3000);
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync');
      setSyncStep('idle');
    }
  };

  const handleRefreshPnL = async () => {
    setIsRefreshingPnL(true);
    try {
      const response = await fetch('/api/pnl/refresh', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Refresh failed');
      }

      toast.success('P&L data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing P&L:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh P&L');
    } finally {
      setIsRefreshingPnL(false);
    }
  };

  const totalConfigured =
    (shopifyStatus?.configuredStores || 0) + (etsyStatus?.configuredStores || 0);

  const anySyncing = isSyncing.shopify || isSyncing.etsy || isSyncing.all || syncStep !== 'idle';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order Sync</h2>
          <p className="text-muted-foreground">
            Sync orders from Shopify and Etsy into the P&L dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchPlatformStatus} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Platform Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Shopify Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Shopify</CardTitle>
              </div>
              <Badge variant={shopifyStatus?.configuredStores ? 'default' : 'secondary'}>
                {shopifyStatus?.configuredStores || 0} store(s) configured
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2">
                {shopifyStatus?.stores.map((store) => (
                  <div
                    key={store.brand}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{store.brand}</span>
                    {store.configured ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs truncate max-w-[150px]">
                          {store.domain}
                        </span>
                        {store.status === 'connected' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not configured</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Etsy Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">Etsy</CardTitle>
              </div>
              <Badge variant={etsyStatus?.configuredStores ? 'default' : 'secondary'}>
                {etsyStatus?.configuredStores || 0} store(s) configured
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2">
                {etsyStatus?.stores.map((store) => (
                  <div
                    key={store.brand}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{store.brand}</span>
                    {store.configured ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          Shop {store.shopId}
                        </span>
                        {store.status === 'connected' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not configured</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration Alert */}
      {!isLoading && totalConfigured === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Platforms Configured</AlertTitle>
          <AlertDescription>
            Set environment variables to connect your stores:
            <ul className="mt-2 list-disc list-inside text-sm">
              <li>
                Shopify: SHOPIFY_DC_STORE_DOMAIN, SHOPIFY_DC_ACCESS_TOKEN
              </li>
              <li>Etsy: ETSY_DC_API_KEY, ETSY_DC_SHOP_ID, ETSY_DC_ACCESS_TOKEN</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Orders</CardTitle>
          <CardDescription>
            Pull orders from connected platforms into the P&L database.
            Orders within the selected date range will be fetched and upserted
            (new orders added, existing orders updated). Orders outside the
            range are not affected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Selection */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date Range (orders created within this period)</Label>
              <Select
                value={useCustomRange ? 'custom' : syncDays}
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setUseCustomRange(true);
                    setCustomStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                  } else {
                    setUseCustomRange(false);
                    setSyncDays(v);
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {useCustomRange && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Primary Action - Sync & Update */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Sync Orders & Update Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  {syncStep === 'idle' && 'Pull new orders from all platforms and refresh dashboard data'}
                  {syncStep === 'syncing' && 'Step 1/2: Syncing orders from Shopify & Etsy...'}
                  {syncStep === 'refreshing' && 'Step 2/2: Updating dashboard calculations...'}
                  {syncStep === 'done' && '✓ Complete! Dashboard is now up to date.'}
                </p>
              </div>
              <Button
                onClick={handleSyncAndUpdate}
                disabled={syncStep !== 'idle' || totalConfigured === 0}
                size="lg"
                className="min-w-[180px]"
              >
                {syncStep === 'idle' && (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync & Update
                  </>
                )}
                {syncStep === 'syncing' && (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                )}
                {syncStep === 'refreshing' && (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                )}
                {syncStep === 'done' && (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Done!
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Advanced Options (collapsed) */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Advanced: Sync individual platforms or refresh P&L only
            </summary>
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
              <Button
                onClick={handleShopifySync}
                disabled={anySyncing || syncStep !== 'idle' || !shopifyStatus?.configuredStores}
                variant="outline"
                size="sm"
              >
                {isSyncing.shopify ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Store className="h-4 w-4 mr-2" />
                )}
                Sync Shopify Only
              </Button>

              <Button
                onClick={handleEtsySync}
                disabled={anySyncing || syncStep !== 'idle' || !etsyStatus?.configuredStores}
                variant="outline"
                size="sm"
              >
                {isSyncing.etsy ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4 mr-2" />
                )}
                Sync Etsy Only
              </Button>

              <Button
                onClick={handleRefreshPnL}
                disabled={isRefreshingPnL || syncStep !== 'idle'}
                variant="outline"
                size="sm"
              >
                {isRefreshingPnL ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Refresh P&L Only
              </Button>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {lastSyncResults && lastSyncResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Results</CardTitle>
            <CardDescription>
              Results from the most recent sync operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lastSyncResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {result.platform === 'shopify' ? (
                        <Store className="h-4 w-4 text-green-600" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="font-medium">
                        {result.platform
                          ? result.platform.charAt(0).toUpperCase() + result.platform.slice(1)
                          : ''}{' '}
                        - {result.brand}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {result.dateRange.start} to {result.dateRange.end}
                    </div>
                    {result.errors.length > 0 && (
                      <div className="text-sm text-red-600 mt-1">
                        {result.errors.length} error(s):{' '}
                        {result.errors.slice(0, 2).join(', ')}
                        {result.errors.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{result.recordsSynced}</div>
                    <div className="text-xs text-muted-foreground">orders synced</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment Variables</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-2">Configure the following environment variables to connect your stores:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-foreground mb-1">Shopify</p>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">SHOPIFY_DC_STORE_DOMAIN</code>
              <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">SHOPIFY_DC_ACCESS_TOKEN</code>
              <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">SHOPIFY_BI_STORE_DOMAIN</code>
              <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">SHOPIFY_BI_ACCESS_TOKEN</code>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Etsy</p>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">ETSY_DC_API_KEY</code>
              <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">ETSY_DC_SHOP_ID</code>
              <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">ETSY_DC_ACCESS_TOKEN</code>
              <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">ETSY_DC_REFRESH_TOKEN</code> (optional)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
