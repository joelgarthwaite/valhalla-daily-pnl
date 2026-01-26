'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
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
import type { CountryPnL } from '@/lib/pnl/country-calculations';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';

interface CountryTableProps {
  data: CountryPnL[];
  isLoading?: boolean;
}

type SortKey = 'revenue' | 'orders' | 'gp2' | 'gp2Margin' | 'aov';
type SortDirection = 'asc' | 'desc';

export function CountryTable({ data, isLoading = false }: CountryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const toggleRow = (countryCode: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(countryCode)) {
      newExpanded.delete(countryCode);
    } else {
      newExpanded.add(countryCode);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * multiplier;
  });

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading country data...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          No country data available for the selected period
        </div>
      </div>
    );
  }

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="text-right">
              <SortButton column="revenue" label="Revenue" />
            </TableHead>
            <TableHead className="text-right">Share %</TableHead>
            <TableHead className="text-right">
              <SortButton column="orders" label="Orders" />
            </TableHead>
            <TableHead className="text-right">
              <SortButton column="aov" label="AOV" />
            </TableHead>
            <TableHead className="text-right">COGS</TableHead>
            <TableHead className="text-right">GP1</TableHead>
            <TableHead className="text-right">Fees</TableHead>
            <TableHead className="text-right">Pick/Pack</TableHead>
            <TableHead className="text-right">Logistics</TableHead>
            <TableHead className="text-right">
              <SortButton column="gp2" label="GP2" />
            </TableHead>
            <TableHead className="text-right">
              <SortButton column="gp2Margin" label="GP2 %" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row) => {
            const isExpanded = expandedRows.has(row.countryCode);
            const isProfit = row.gp2 >= 0;

            return (
              <>
                <TableRow key={row.countryCode} className="hover:bg-muted/50">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleRow(row.countryCode)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="mr-2">{row.countryFlag}</span>
                    {row.countryName}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPercentage(row.revenueShare, 1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.orders.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.aov)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.cogs)})
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.gp1)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.totalPlatformFees)})
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.pickPackCost)})
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ({formatCurrency(row.logisticsCost)})
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-bold',
                      isProfit ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {formatCurrency(row.gp2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={row.gp2Margin >= 50 ? 'default' : 'secondary'}
                      className={cn(
                        row.gp2Margin >= 50
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : row.gp2Margin >= 40
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      {formatPercentage(row.gp2Margin)}
                    </Badge>
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {isExpanded && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={13}>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                          {/* Platform Revenue Breakdown */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Revenue by Platform</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shopify</span>
                                <span>{formatCurrency(row.shopifyRevenue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Etsy</span>
                                <span>{formatCurrency(row.etsyRevenue)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Platform Orders Breakdown */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Orders by Platform</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shopify</span>
                                <span>{row.shopifyOrders.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Etsy</span>
                                <span>{row.etsyOrders.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Platform Fees Breakdown */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Platform Fees</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shopify (2.9% + 30p)</span>
                                <span className="text-red-600">
                                  ({formatCurrency(row.shopifyFees)})
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Etsy (6.5%)</span>
                                <span className="text-red-600">
                                  ({formatCurrency(row.etsyFees)})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Margin Breakdown */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Margin Analysis</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">GP1 Margin</span>
                                <span>{formatPercentage(row.gp1Margin)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">GP2 Margin</span>
                                <span
                                  className={cn(
                                    'font-medium',
                                    row.gp2Margin >= 50 ? 'text-green-600' : row.gp2Margin >= 40 ? 'text-yellow-600' : 'text-red-600'
                                  )}
                                >
                                  {formatPercentage(row.gp2Margin)}
                                </span>
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
