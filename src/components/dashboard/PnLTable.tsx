'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

  return (
    <div className="rounded-md border overflow-x-auto">
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
  );
}
