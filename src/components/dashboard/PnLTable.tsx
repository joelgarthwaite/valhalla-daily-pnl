'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AggregatedPnL } from '@/lib/pnl/aggregations';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';

interface PnLTableProps {
  data: AggregatedPnL[];
  isLoading?: boolean;
  showDetails?: boolean;
}

export function PnLTable({ data, isLoading = false, showDetails = true }: PnLTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (period: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(period)) {
      newExpanded.delete(period);
    } else {
      newExpanded.add(period);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading P&L data...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          No data available for the selected period
        </div>
      </div>
    );
  }

  // Mobile Card View Component
  const MobileCardView = () => (
    <div className="space-y-3 md:hidden">
      {data.map((row, index) => {
        const isExpanded = expandedRows.has(row.period);
        const isProfit = row.netProfit >= 0;

        return (
          <Card
            key={row.period}
            className={cn(
              "overflow-hidden transition-colors",
              isProfit ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"
            )}
          >
            <CardContent className="p-4">
              {/* Header with period label and index badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded">
                    {index === 0 ? 'Latest' : `${index + 1}`}
                  </span>
                  <span className="font-semibold text-base">{row.periodLabel}</span>
                  {isProfit ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    row.netMarginPct >= 25
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : row.netMarginPct >= 0
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                  )}
                >
                  {formatPercentage(row.netMarginPct)} margin
                </Badge>
              </div>

              {/* Primary metrics row */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                  <p className="text-lg font-bold">{formatCurrency(row.totalRevenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit</p>
                  <p className={cn(
                    "text-lg font-bold",
                    isProfit ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(row.netProfit)}
                  </p>
                </div>
              </div>

              {/* Secondary metrics */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="font-medium">{row.totalOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">AOV</p>
                  <p className="font-medium">{formatCurrency(row.avgOrderValue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Ad Spend</p>
                  <p className="font-medium text-muted-foreground">({formatCurrency(row.totalAdSpend)})</p>
                </div>
              </div>

              {/* Expandable details */}
              {showDetails && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 h-8 text-xs text-muted-foreground"
                    onClick={() => toggleRow(row.period)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4 mr-1" />
                        Show Details
                      </>
                    )}
                  </Button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      {/* Revenue Breakdown */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Revenue by Channel</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shopify</span>
                            <span className="font-medium">{formatCurrency(row.shopifyRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Etsy</span>
                            <span className="font-medium">{formatCurrency(row.etsyRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">B2B</span>
                            <span className="font-medium">{formatCurrency(row.b2bRevenue)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Costs</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">COGS</span>
                            <span className="text-red-600">({formatCurrency(row.cogsEstimated)})</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="text-red-600">({formatCurrency(row.shippingCost)})</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Platform Fees</span>
                            <span className="text-red-600">({formatCurrency(row.totalPlatformFees)})</span>
                          </div>
                        </div>
                      </div>

                      {/* Profit Tiers */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Profit Tiers</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gross Profit (GP1)</span>
                            <span className="font-medium">{formatCurrency(row.grossProfit)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gross Margin</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                row.grossMarginPct >= 70
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              )}
                            >
                              {formatPercentage(row.grossMarginPct)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Card View */}
      <MobileCardView />

      {/* Desktop Table View */}
      <div className="rounded-md border overflow-x-auto hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">COGS</TableHead>
            <TableHead className="text-right">Gross Profit</TableHead>
            <TableHead className="text-right">GM %</TableHead>
            <TableHead className="text-right">Shipping</TableHead>
            <TableHead className="text-right">Ad Spend</TableHead>
            <TableHead className="text-right">Fees</TableHead>
            <TableHead className="text-right">Net Profit</TableHead>
            <TableHead className="text-right">NM %</TableHead>
            <TableHead className="text-right">Orders</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const isExpanded = expandedRows.has(row.period);
            const isProfit = row.netProfit >= 0;

            return (
              <>
                <TableRow key={row.period} className="hover:bg-muted/50">
                  <TableCell>
                    {showDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleRow(row.period)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.periodLabel}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.cogsEstimated)})
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.grossProfit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={row.grossMarginPct >= 70 ? 'default' : 'secondary'}
                      className={cn(
                        row.grossMarginPct >= 70
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : 'bg-yellow-100 text-yellow-700'
                      )}
                    >
                      {formatPercentage(row.grossMarginPct)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.shippingCost)})
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.totalAdSpend)})
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.totalPlatformFees)})
                  </TableCell>
                  <TableCell className={cn(
                    'text-right font-bold',
                    isProfit ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(row.netProfit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={row.netMarginPct >= 25 ? 'default' : 'secondary'}
                      className={cn(
                        row.netMarginPct >= 25
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : row.netMarginPct >= 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      )}
                    >
                      {formatPercentage(row.netMarginPct)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.totalOrders.toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {isExpanded && showDetails && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={12}>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-8">
                          {/* Revenue Breakdown */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Revenue Breakdown</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shopify</span>
                                <span>{formatCurrency(row.shopifyRevenue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Etsy</span>
                                <span>{formatCurrency(row.etsyRevenue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">B2B</span>
                                <span>{formatCurrency(row.b2bRevenue)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Shipping Breakdown */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Shipping</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Charged</span>
                                <span className="text-green-600">
                                  {formatCurrency(row.shippingMargin + row.shippingCost)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost</span>
                                <span className="text-red-600">
                                  ({formatCurrency(row.shippingCost)})
                                </span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Margin</span>
                                <span className={row.shippingMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(row.shippingMargin)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Order Stats */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Order Stats</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Avg Order Value</span>
                                <span>{formatCurrency(row.avgOrderValue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Avg Daily Revenue</span>
                                <span>{formatCurrency(row.avgDailyRevenue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Avg Daily Orders</span>
                                <span>{row.avgDailyOrders.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </>
  );
}
