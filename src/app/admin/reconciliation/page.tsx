'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, getWeek, startOfWeek, endOfWeek, setWeek, getYear, eachWeekOfInterval, startOfYear, endOfYear } from 'date-fns';
import { AlertTriangle, CheckCircle2, RefreshCw, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import {
  EXPECTED_2025_DATA,
  buildReconciliationReport,
  getReconciliationSummary,
  formatReconciliationCurrency as formatCurrency,
  formatVariancePercent as formatPercent,
  type ActualWeeklyData,
  type ExpectedWeeklyData,
} from '@/lib/pnl/reconciliation';
import type { ReconciliationRow } from '@/types';
import { cn } from '@/lib/utils';

export default function ReconciliationPage() {
  const [year, setYear] = useState<number>(2025);
  const [isLoading, setIsLoading] = useState(true);
  const [actualData, setActualData] = useState<ActualWeeklyData[]>([]);
  const [showDiscrepanciesOnly, setShowDiscrepanciesOnly] = useState(false);
  const [discrepancyThreshold, setDiscrepancyThreshold] = useState(5);

  const supabase = createClient();

  // Fetch actual data from database
  const fetchActualData = async () => {
    setIsLoading(true);
    try {
      // Get date range for the year
      const yearStart = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');

      // Fetch orders for the year (exclude manually excluded orders)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('order_date, platform, subtotal')
        .is('excluded_at', null)  // Only include non-excluded orders
        .gte('order_date', yearStart)
        .lte('order_date', yearEnd);

      if (ordersError) throw ordersError;

      // Type assertion for orders
      const orders = (ordersData || []) as Array<{
        order_date: string;
        platform: string;
        subtotal: number;
      }>;

      // Fetch B2B revenue for the year
      const { data: b2bData, error: b2bError } = await supabase
        .from('b2b_revenue')
        .select('date, subtotal')
        .gte('date', yearStart)
        .lte('date', yearEnd);

      if (b2bError) throw b2bError;

      // Type assertion for B2B
      const b2bRevenue = (b2bData || []) as Array<{
        date: string;
        subtotal: number;
      }>;

      // Aggregate by week
      const weeklyMap = new Map<number, ActualWeeklyData>();

      // Initialize all weeks
      for (let week = 1; week <= 52; week++) {
        weeklyMap.set(week, { week, year, shopify: 0, etsy: 0, b2b: 0 });
      }

      // Aggregate orders
      orders.forEach((order) => {
        const date = new Date(order.order_date);
        const weekNum = getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });

        if (weekNum >= 1 && weekNum <= 52) {
          const weekData = weeklyMap.get(weekNum)!;
          if (order.platform === 'shopify') {
            weekData.shopify += order.subtotal || 0;
          } else if (order.platform === 'etsy') {
            weekData.etsy += order.subtotal || 0;
          }
        }
      });

      // Aggregate B2B
      b2bRevenue.forEach((b2b) => {
        const date = new Date(b2b.date);
        const weekNum = getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });

        if (weekNum >= 1 && weekNum <= 52) {
          const weekData = weeklyMap.get(weekNum)!;
          weekData.b2b += b2b.subtotal || 0;
        }
      });

      setActualData(Array.from(weeklyMap.values()));
    } catch (error) {
      console.error('Error fetching actual data:', error);
      toast.error('Failed to load actual revenue data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActualData();
  }, [year]);

  // Get expected data for selected year
  const expectedData: ExpectedWeeklyData[] = useMemo(() => {
    // For now, only 2025 has expected data
    if (year === 2025) {
      return EXPECTED_2025_DATA;
    }
    // Return empty expected data for other years
    return Array.from({ length: 52 }, (_, i) => ({
      week: i + 1,
      shopify: 0,
      etsy: 0,
      b2b: 0,
    }));
  }, [year]);

  // Build reconciliation report
  const reconciliationRows = useMemo(() => {
    return buildReconciliationReport(year, expectedData, actualData, discrepancyThreshold);
  }, [year, expectedData, actualData, discrepancyThreshold]);

  // Get summary
  const summary = useMemo(() => {
    return getReconciliationSummary(reconciliationRows);
  }, [reconciliationRows]);

  // Filter rows
  const displayRows = useMemo(() => {
    if (showDiscrepanciesOnly) {
      return reconciliationRows.filter((r) => r.hasDiscrepancy);
    }
    return reconciliationRows;
  }, [reconciliationRows, showDiscrepanciesOnly]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Week',
      'Start Date',
      'End Date',
      'Expected Shopify',
      'Actual Shopify',
      'Variance Shopify',
      'Expected Etsy',
      'Actual Etsy',
      'Variance Etsy',
      'Expected B2B',
      'Actual B2B',
      'Variance B2B',
      'Expected Total',
      'Actual Total',
      'Variance Total',
      'Variance %',
      'Has Discrepancy',
    ];

    const rows = reconciliationRows.map((r) => [
      r.week,
      r.startDate,
      r.endDate,
      r.expected.shopify,
      r.actual.shopify,
      r.variance.shopify,
      r.expected.etsy,
      r.actual.etsy,
      r.variance.etsy,
      r.expected.b2b,
      r.actual.b2b,
      r.variance.b2b,
      r.expected.total,
      r.actual.total,
      r.variance.total,
      r.variancePct.total.toFixed(1) + '%',
      r.hasDiscrepancy ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${year}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Reconciliation</h2>
          <p className="text-muted-foreground">
            Compare system data against spreadsheet to identify discrepancies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchActualData} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Label>Year</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Threshold</Label>
              <Select
                value={discrepancyThreshold.toString()}
                onValueChange={(v) => setDiscrepancyThreshold(parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="discrepancies-only"
                checked={showDiscrepanciesOnly}
                onCheckedChange={setShowDiscrepanciesOnly}
              />
              <Label htmlFor="discrepancies-only" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                Show discrepancies only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expected</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.expectedTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actual</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.actualTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Variance</CardDescription>
            <CardTitle
              className={cn(
                'text-2xl',
                summary.varianceTotal > 0 ? 'text-green-600' : summary.varianceTotal < 0 ? 'text-red-600' : ''
              )}
            >
              {formatCurrency(summary.varianceTotal)} ({formatPercent(summary.variancePctTotal)})
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Weeks with Discrepancies</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {summary.discrepancyCount > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  {summary.discrepancyCount} of {summary.weekCount}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  All matched
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Channel Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shopify Variance</CardDescription>
            <CardTitle
              className={cn(
                'text-lg',
                summary.varianceShopify > 0 ? 'text-green-600' : summary.varianceShopify < 0 ? 'text-red-600' : ''
              )}
            >
              {formatCurrency(summary.varianceShopify)} ({formatPercent(summary.variancePctShopify)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Expected: {formatCurrency(summary.expectedShopify)} | Actual: {formatCurrency(summary.actualShopify)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Etsy Variance</CardDescription>
            <CardTitle
              className={cn(
                'text-lg',
                summary.varianceEtsy > 0 ? 'text-green-600' : summary.varianceEtsy < 0 ? 'text-red-600' : ''
              )}
            >
              {formatCurrency(summary.varianceEtsy)} ({formatPercent(summary.variancePctEtsy)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Expected: {formatCurrency(summary.expectedEtsy)} | Actual: {formatCurrency(summary.actualEtsy)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>B2B Variance</CardDescription>
            <CardTitle
              className={cn(
                'text-lg',
                summary.varianceB2B > 0 ? 'text-green-600' : summary.varianceB2B < 0 ? 'text-red-600' : ''
              )}
            >
              {formatCurrency(summary.varianceB2B)} ({formatPercent(summary.variancePctB2B)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Expected: {formatCurrency(summary.expectedB2B)} | Actual: {formatCurrency(summary.actualB2B)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Note */}
      {year === 2025 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Note: Expected data contains placeholder values</p>
                <p className="text-amber-700">
                  The expected revenue values in EXPECTED_2025_DATA are placeholders. Update them with actual
                  CSV data in <code className="bg-amber-100 px-1 rounded">src/lib/pnl/reconciliation.ts</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Week-by-Week Comparison</CardTitle>
          <CardDescription>
            Showing {displayRows.length} of {reconciliationRows.length} weeks
            {showDiscrepanciesOnly && ` (discrepancies only, threshold: ${discrepancyThreshold}%)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Week</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead colSpan={3} className="text-center border-x">
                    Shopify
                  </TableHead>
                  <TableHead colSpan={3} className="text-center border-x">
                    Etsy
                  </TableHead>
                  <TableHead colSpan={3} className="text-center border-x">
                    B2B
                  </TableHead>
                  <TableHead colSpan={3} className="text-center">
                    Total
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
                <TableRow className="text-xs">
                  <TableHead className="sticky left-0 bg-background"></TableHead>
                  <TableHead></TableHead>
                  <TableHead className="text-right border-l">Exp</TableHead>
                  <TableHead className="text-right">Act</TableHead>
                  <TableHead className="text-right border-r">Var%</TableHead>
                  <TableHead className="text-right border-l">Exp</TableHead>
                  <TableHead className="text-right">Act</TableHead>
                  <TableHead className="text-right border-r">Var%</TableHead>
                  <TableHead className="text-right border-l">Exp</TableHead>
                  <TableHead className="text-right">Act</TableHead>
                  <TableHead className="text-right border-r">Var%</TableHead>
                  <TableHead className="text-right">Exp</TableHead>
                  <TableHead className="text-right">Act</TableHead>
                  <TableHead className="text-right">Var%</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      {showDiscrepanciesOnly ? 'No discrepancies found' : 'No data available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((row) => (
                    <TableRow
                      key={row.weekNumber}
                      className={cn(row.hasDiscrepancy && 'bg-amber-50')}
                    >
                      <TableCell className="sticky left-0 bg-inherit font-medium">
                        Week {row.weekNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(row.startDate), 'MMM d')} - {format(new Date(row.endDate), 'MMM d')}
                      </TableCell>

                      {/* Shopify */}
                      <TableCell className="text-right border-l tabular-nums">
                        {formatCurrency(row.expected.shopify)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.actual.shopify)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right border-r tabular-nums',
                          Math.abs(row.variancePct.shopify) > discrepancyThreshold &&
                            (row.variancePct.shopify > 0 ? 'text-green-600' : 'text-red-600')
                        )}
                      >
                        {formatPercent(row.variancePct.shopify)}
                      </TableCell>

                      {/* Etsy */}
                      <TableCell className="text-right border-l tabular-nums">
                        {formatCurrency(row.expected.etsy)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.actual.etsy)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right border-r tabular-nums',
                          Math.abs(row.variancePct.etsy) > discrepancyThreshold &&
                            (row.variancePct.etsy > 0 ? 'text-green-600' : 'text-red-600')
                        )}
                      >
                        {formatPercent(row.variancePct.etsy)}
                      </TableCell>

                      {/* B2B */}
                      <TableCell className="text-right border-l tabular-nums">
                        {formatCurrency(row.expected.b2b)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.actual.b2b)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right border-r tabular-nums',
                          Math.abs(row.variancePct.b2b) > discrepancyThreshold &&
                            row.expected.b2b > 0 &&
                            (row.variancePct.b2b > 0 ? 'text-green-600' : 'text-red-600')
                        )}
                      >
                        {row.expected.b2b > 0 ? formatPercent(row.variancePct.b2b) : '-'}
                      </TableCell>

                      {/* Total */}
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.expected.total)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.actual.total)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium tabular-nums',
                          Math.abs(row.variancePct.total) > discrepancyThreshold &&
                            (row.variancePct.total > 0 ? 'text-green-600' : 'text-red-600')
                        )}
                      >
                        {formatPercent(row.variancePct.total)}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {row.hasDiscrepancy ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Check
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
