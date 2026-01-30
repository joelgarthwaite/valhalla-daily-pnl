'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Truck,
  Target,
  ArrowRight,
  Wallet,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  href: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

interface ModuleCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  stats?: { label: string; value: string }[];
  status: 'active' | 'coming-soon' | 'needs-attention';
  statusText?: string;
  badge?: { count: number; variant: 'default' | 'destructive' | 'secondary' };
}

interface Alert {
  type: 'warning' | 'info' | 'success';
  message: string;
  action?: { label: string; href: string };
}

export default function HubHomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [pnlData, setPnlData] = useState<{
    revenue: number;
    netProfit: number;
    netMargin: number;
    orders: number;
    revenueChange: number;
    profitChange: number;
    marginChange: number;
  } | null>(null);
  const [wtdData, setWtdData] = useState<{
    revenue: number;
    netProfit: number;
    orders: number;
  } | null>(null);
  const [cashPosition, setCashPosition] = useState<number | null>(null);
  const [unmatchedCount, setUnmatchedCount] = useState<number>(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Calculate dates
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);

        // Week-to-date: Monday of current week
        const weekStart = new Date(today);
        const dayOfWeek = weekStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - daysToMonday);

        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const dayBeforeStr = dayBefore.toISOString().split('T')[0];
        const weekStartStr = weekStart.toISOString().split('T')[0];

        // Fetch yesterday's and day-before-yesterday's P&L data in parallel
        const [yesterdayRes, dayBeforeRes, wtdRes, xeroRes, unmatchedRes] = await Promise.all([
          fetch(`/api/pnl/data?from=${yesterdayStr}&to=${yesterdayStr}&brand=all`),
          fetch(`/api/pnl/data?from=${dayBeforeStr}&to=${dayBeforeStr}&brand=all`),
          fetch(`/api/pnl/data?from=${weekStartStr}&to=${yesterdayStr}&brand=all`),
          fetch('/api/xero/balances?brand=all'),
          fetch('/api/invoices/unmatched?status=pending&limit=1'),
        ]);

        // Process yesterday's data
        if (yesterdayRes.ok) {
          const data = await yesterdayRes.json();

          // Extract last sync time from the updated_at timestamps
          if (data.dailyPnl && data.dailyPnl.length > 0) {
            const maxUpdatedAt = data.dailyPnl.reduce((max: string | null, record: { updated_at?: string }) => {
              if (!record.updated_at) return max;
              if (!max) return record.updated_at;
              return record.updated_at > max ? record.updated_at : max;
            }, null);
            if (maxUpdatedAt) {
              setLastSyncTime(new Date(maxUpdatedAt));
            }
          }

          if (data.dailyPnl && data.dailyPnl.length > 0) {
            // Aggregate all brand data for the day
            // Note: API returns net_profit (which is GP3 = GP2 - Ad Spend)
            const totalRevenue = data.dailyPnl.reduce((sum: number, day: { total_revenue?: number }) => sum + (day.total_revenue || 0), 0);
            const totalGp3 = data.dailyPnl.reduce((sum: number, day: { net_profit?: number }) => sum + (day.net_profit || 0), 0);
            const totalOrders = data.dailyPnl.reduce((sum: number, day: { total_orders?: number }) => sum + (day.total_orders || 0), 0);

            // Calculate True Net Profit = GP3 - OPEX (OPEX is for the period)
            const periodOpex = data.opex?.periodTotal || 0;
            const netProfit = totalGp3 - periodOpex;
            const netRevenue = data.dailyPnl.reduce((sum: number, day: { net_revenue?: number; total_revenue?: number }) =>
              sum + (day.net_revenue || day.total_revenue || 0), 0);
            const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

            // Get comparison data
            let revenueChange = 0;
            let profitChange = 0;
            let marginChange = 0;

            if (dayBeforeRes.ok) {
              const prevData = await dayBeforeRes.json();
              if (prevData.dailyPnl && prevData.dailyPnl.length > 0) {
                const prevRevenue = prevData.dailyPnl.reduce((sum: number, day: { total_revenue?: number }) => sum + (day.total_revenue || 0), 0);
                const prevGp3 = prevData.dailyPnl.reduce((sum: number, day: { net_profit?: number }) => sum + (day.net_profit || 0), 0);
                const prevOpex = prevData.opex?.periodTotal || 0;
                const prevProfit = prevGp3 - prevOpex;
                const prevNetRevenue = prevData.dailyPnl.reduce((sum: number, day: { net_revenue?: number; total_revenue?: number }) =>
                  sum + (day.net_revenue || day.total_revenue || 0), 0);
                const prevMargin = prevNetRevenue > 0 ? (prevProfit / prevNetRevenue) * 100 : 0;

                if (prevRevenue > 0) {
                  revenueChange = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
                }
                if (prevProfit !== 0) {
                  profitChange = ((netProfit - prevProfit) / Math.abs(prevProfit)) * 100;
                }
                marginChange = netMargin - prevMargin;
              }
            }

            setPnlData({
              revenue: totalRevenue,
              netProfit,
              netMargin,
              orders: totalOrders,
              revenueChange,
              profitChange,
              marginChange,
            });
          }
        }

        // Process week-to-date data
        if (wtdRes.ok) {
          const data = await wtdRes.json();
          if (data.dailyPnl && data.dailyPnl.length > 0) {
            // Also check WTD data for more recent sync times
            const wtdMaxUpdatedAt = data.dailyPnl.reduce((max: string | null, record: { updated_at?: string }) => {
              if (!record.updated_at) return max;
              if (!max) return record.updated_at;
              return record.updated_at > max ? record.updated_at : max;
            }, null);
            if (wtdMaxUpdatedAt) {
              setLastSyncTime(prev => {
                if (!prev) return new Date(wtdMaxUpdatedAt);
                const wtdDate = new Date(wtdMaxUpdatedAt);
                return wtdDate > prev ? wtdDate : prev;
              });
            }

            // Aggregate all brand data for the WTD period
            // Note: API returns net_profit (which is GP3 = GP2 - Ad Spend)
            const totals = data.dailyPnl.reduce(
              (acc: { revenue: number; gp3: number; orders: number }, day: { total_revenue?: number; net_profit?: number; total_orders?: number }) => ({
                revenue: acc.revenue + (day.total_revenue || 0),
                gp3: acc.gp3 + (day.net_profit || 0),
                orders: acc.orders + (day.total_orders || 0),
              }),
              { revenue: 0, gp3: 0, orders: 0 }
            );
            // True Net Profit = GP3 - OPEX (for the period)
            const periodOpex = data.opex?.periodTotal || 0;
            setWtdData({
              revenue: totals.revenue,
              netProfit: totals.gp3 - periodOpex,
              orders: totals.orders,
            });
          }
        }

        // Fetch cash position from Xero
        if (xeroRes.ok) {
          const xeroData = await xeroRes.json();
          if (xeroData.totals) {
            setCashPosition(xeroData.totals.netPosition);
          }
        }

        // Fetch unmatched invoice count
        if (unmatchedRes.ok) {
          const unmatchedData = await unmatchedRes.json();
          setUnmatchedCount(unmatchedData.total || 0);
        }

        // Build alerts based on data
        const newAlerts: Alert[] = [];

        if (pnlData && pnlData.netProfit < 0) {
          newAlerts.push({
            type: 'warning',
            message: 'Yesterday was unprofitable. Review costs and ad spend.',
            action: { label: 'View P&L', href: '/pnl' },
          });
        }

        if (unmatchedCount > 0) {
          newAlerts.push({
            type: 'info',
            message: `${unmatchedCount} unmatched shipping invoice${unmatchedCount > 1 ? 's' : ''} need${unmatchedCount === 1 ? 's' : ''} review.`,
            action: { label: 'Review', href: '/shipping/unmatched' },
          });
        }

        setAlerts(newAlerts);

      } catch (error) {
        console.error('Failed to fetch hub data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Format change for display
  const formatChange = (change: number | undefined): string => {
    if (change === undefined || isNaN(change)) return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Format last sync time for display
  const formatSyncTime = (date: Date | null): string => {
    if (!date) return 'Unknown';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const syncDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (syncDay.getTime() === today.getTime()) {
      return `Today ${timeStr}`;
    } else if (syncDay.getTime() === yesterday.getTime()) {
      return `Yesterday ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }) + ` ${timeStr}`;
    }
  };

  const quickStats: QuickStat[] = [
    {
      label: "Yesterday's Revenue",
      value: pnlData ? formatCurrency(pnlData.revenue) : '-',
      change: pnlData?.revenueChange,
      changeLabel: 'vs prev day',
      icon: DollarSign,
      href: '/pnl',
      trend: pnlData && pnlData.revenueChange > 0 ? 'up' : pnlData && pnlData.revenueChange < 0 ? 'down' : 'neutral',
    },
    {
      label: 'Net Profit',
      value: pnlData ? formatCurrency(pnlData.netProfit) : '-',
      change: pnlData?.profitChange,
      changeLabel: 'vs prev day',
      icon: pnlData && pnlData.netProfit >= 0 ? TrendingUp : TrendingDown,
      href: '/pnl',
      trend: pnlData && pnlData.netProfit >= 0 ? 'up' : 'down',
    },
    {
      label: 'Net Margin',
      value: pnlData ? formatPercent(pnlData.netMargin) : '-',
      change: pnlData?.marginChange,
      changeLabel: 'vs prev day',
      icon: Target,
      href: '/pnl',
      trend: pnlData && pnlData.netMargin >= 15 ? 'up' : pnlData && pnlData.netMargin >= 10 ? 'neutral' : 'down',
      subtitle: pnlData && pnlData.netMargin >= 15 ? 'On target' : pnlData && pnlData.netMargin >= 10 ? 'Below target' : 'Needs attention',
    },
    {
      label: 'Orders',
      value: pnlData ? formatNumber(pnlData.orders) : '-',
      icon: ShoppingCart,
      href: '/pnl',
      trend: 'neutral',
      subtitle: wtdData ? `${formatNumber(wtdData.orders)} this week` : undefined,
    },
    {
      label: 'Cash Position',
      value: cashPosition !== null ? formatCurrency(cashPosition) : '-',
      icon: Wallet,
      href: '/admin/xero',
      trend: cashPosition !== null && cashPosition > 0 ? 'up' : 'down',
      subtitle: 'From Xero',
    },
  ];

  // Week-to-date summary stats
  const wtdStats = wtdData ? [
    { label: 'WTD Revenue', value: formatCurrency(wtdData.revenue) },
    { label: 'WTD Profit', value: formatCurrency(wtdData.netProfit), trend: wtdData.netProfit >= 0 ? 'up' : 'down' as const },
    { label: 'WTD Orders', value: formatNumber(wtdData.orders) },
  ] : [];

  const modules: ModuleCard[] = [
    {
      title: 'P&L Dashboard',
      description: 'Daily profit & loss with GP1, GP2, GP3, and True Net Profit waterfall',
      href: '/pnl',
      icon: TrendingUp,
      stats: pnlData ? [
        { label: 'Revenue', value: formatCurrency(pnlData.revenue) },
        { label: 'Net Margin', value: formatPercent(pnlData.netMargin) },
      ] : undefined,
      status: 'active',
    },
    {
      title: 'Country Analysis',
      description: 'P&L breakdown by customer shipping destination',
      href: '/pnl/country',
      icon: Target,
      status: 'active',
    },
    {
      title: 'Shipping Analytics',
      description: 'Carrier costs, margins, and invoice management',
      href: '/shipping',
      icon: Truck,
      status: unmatchedCount > 0 ? 'needs-attention' : 'active',
      statusText: unmatchedCount > 0 ? `${unmatchedCount} unmatched` : undefined,
      badge: unmatchedCount > 0 ? { count: unmatchedCount, variant: 'destructive' } : undefined,
    },
    {
      title: 'EOS Framework',
      description: 'Rocks, Scorecard, Level 10 meetings, and IDS',
      href: '/eos',
      icon: Target,
      status: 'coming-soon',
      statusText: 'Migration planned',
    },
    {
      title: 'Cash Flow',
      description: 'Bank balances, runway projections, and forecasting',
      href: '/finance/cashflow',
      icon: Wallet,
      status: 'coming-soon',
      statusText: 'In development',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome to Valhalla Hub</h1>
        <p className="text-muted-foreground mt-1">
          Your unified business intelligence dashboard for Display Champ & Bright Ivy
        </p>
      </div>

      {/* Quick Stats - Yesterday */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {quickStats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-20 mt-1" />
                    ) : (
                      <>
                        <p className={`text-xl font-bold mt-1 ${
                          stat.trend === 'up' ? 'text-green-600' :
                          stat.trend === 'down' ? 'text-red-600' : ''
                        }`}>
                          {stat.value}
                        </p>
                        {stat.change !== undefined && stat.change !== 0 && (
                          <p className={`text-xs mt-0.5 ${
                            stat.change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatChange(stat.change)} {stat.changeLabel}
                          </p>
                        )}
                        {stat.subtitle && !stat.change && (
                          <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 ${
                    stat.trend === 'up' ? 'bg-green-100 text-green-600' :
                    stat.trend === 'down' ? 'bg-red-100 text-red-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Week-to-Date Summary */}
      {wtdData && (
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Week-to-Date</span>
              </div>
              <div className="flex gap-6">
                {wtdStats.map((stat) => (
                  <div key={stat.label} className="text-sm">
                    <span className="text-muted-foreground">{stat.label}: </span>
                    <span className={`font-semibold ${
                      'trend' in stat && stat.trend === 'up' ? 'text-green-600' :
                      'trend' in stat && stat.trend === 'down' ? 'text-red-600' : ''
                    }`}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts Section - Dynamic based on data */}
      {(unmatchedCount > 0 || (pnlData && pnlData.netProfit < 0)) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pnlData && pnlData.netProfit < 0 && (
                <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Yesterday was unprofitable ({formatCurrency(pnlData.netProfit)})</span>
                  </div>
                  <Link href="/pnl">
                    <Button variant="outline" size="sm">View P&L</Button>
                  </Link>
                </div>
              )}
              {unmatchedCount > 0 && (
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">{unmatchedCount} unmatched shipping invoice{unmatchedCount > 1 ? 's' : ''} need{unmatchedCount === 1 ? 's' : ''} review</span>
                  </div>
                  <Link href="/shipping/unmatched">
                    <Button variant="outline" size="sm">Review</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/sync">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Latest Data
              </Button>
            </Link>
            <Link href="/admin/opex">
              <Button variant="outline" size="sm">
                <Wallet className="h-4 w-4 mr-2" />
                Update OPEX
              </Button>
            </Link>
            <Link href="/admin/ad-spend">
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Check Ad Spend
              </Button>
            </Link>
            <Link href="/admin/orders">
              <Button variant="outline" size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Manage Orders
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Module Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Modules</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.title}
              href={module.status === 'coming-soon' ? '#' : module.href}
              onClick={(e) => module.status === 'coming-soon' && e.preventDefault()}
            >
              <Card className={`h-full transition-colors ${
                module.status === 'coming-soon'
                  ? 'opacity-60 cursor-not-allowed'
                  : module.status === 'needs-attention'
                  ? 'hover:bg-muted/50 cursor-pointer group border-amber-300 bg-amber-50/30'
                  : 'hover:bg-muted/50 cursor-pointer group'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      module.status === 'active'
                        ? 'bg-primary/10 text-primary'
                        : module.status === 'needs-attention'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <module.icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {module.badge && (
                        <Badge variant={module.badge.variant} className="text-xs">
                          {module.badge.count}
                        </Badge>
                      )}
                      {module.status === 'active' && !module.badge && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}
                      {module.status === 'needs-attention' && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          {module.statusText || 'Needs attention'}
                        </span>
                      )}
                      {module.status === 'coming-soon' && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {module.statusText || 'Coming Soon'}
                        </span>
                      )}
                      {(module.status === 'active' || module.status === 'needs-attention') && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                {module.stats && (
                  <CardContent className="pt-0">
                    <div className="flex gap-4 text-sm">
                      {module.stats.map((stat) => (
                        <div key={stat.label}>
                          <span className="text-muted-foreground">{stat.label}: </span>
                          <span className="font-medium">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity / Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Data Sync</span>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : lastSyncTime ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {formatSyncTime(lastSyncTime)}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Unknown
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Meta Ads Connection</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Shopify Integration</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Etsy Integration</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Xero Banking</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
