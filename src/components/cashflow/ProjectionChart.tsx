'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ScenarioChartPoint, ScenarioComparison } from '@/lib/cashflow/scenarios';

interface ProjectionChartProps {
  chartData: ScenarioChartPoint[];
  comparison: ScenarioComparison;
  isLoading?: boolean;
}

type ScenarioView = 'all' | 'baseline' | 'optimistic' | 'pessimistic';

export function ProjectionChart({
  chartData,
  comparison,
  isLoading,
}: ProjectionChartProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioView>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Transform data for display
  const displayData = chartData.map((point) => ({
    ...point,
    formattedDate: format(parseISO(point.date), 'dd MMM'),
    weekLabel: `W${point.week}`,
  }));

  const riskColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-medium">12-Week Projection</CardTitle>
            <Badge className={riskColors[comparison.riskAssessment]}>
              {comparison.riskAssessment.charAt(0).toUpperCase() + comparison.riskAssessment.slice(1)} Risk
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'baseline', 'optimistic', 'pessimistic'] as ScenarioView[]).map((scenario) => (
              <Button
                key={scenario}
                variant={activeScenario === scenario ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveScenario(scenario)}
                className="text-xs"
              >
                {scenario === 'all' ? 'All' : scenario.charAt(0).toUpperCase() + scenario.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Scenario Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Optimistic</div>
            <div className={cn(
              'font-semibold',
              comparison.optimisticEndBalance >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(comparison.optimisticEndBalance)}
            </div>
          </div>
          <div className="text-center border-x">
            <div className="text-xs text-muted-foreground mb-1">Baseline</div>
            <div className={cn(
              'font-semibold',
              comparison.baselineEndBalance >= 0 ? 'text-foreground' : 'text-red-600'
            )}>
              {formatCurrency(comparison.baselineEndBalance)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Pessimistic</div>
            <div className={cn(
              'font-semibold',
              comparison.pessimisticEndBalance >= 0 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {formatCurrency(comparison.pessimisticEndBalance)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayData}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <p className="text-sm font-medium mb-2">Week {data.week}</p>
                        <p className="text-xs text-muted-foreground">{data.formattedDate}</p>
                        <div className="mt-2 space-y-1">
                          {(activeScenario === 'all' || activeScenario === 'optimistic') && (
                            <p className="text-sm">
                              <span className="text-green-500">Optimistic:</span> {formatCurrency(data.optimistic)}
                            </p>
                          )}
                          {(activeScenario === 'all' || activeScenario === 'baseline') && (
                            <p className="text-sm">
                              <span className="text-blue-500">Baseline:</span> {formatCurrency(data.baseline)}
                            </p>
                          )}
                          {(activeScenario === 'all' || activeScenario === 'pessimistic') && (
                            <p className="text-sm">
                              <span className="text-red-500">Pessimistic:</span> {formatCurrency(data.pessimistic)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" label="Zero" />

              {(activeScenario === 'all' || activeScenario === 'optimistic') && (
                <Line
                  type="monotone"
                  dataKey="optimistic"
                  name="Optimistic"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray={activeScenario === 'all' ? '5 5' : undefined}
                />
              )}
              {(activeScenario === 'all' || activeScenario === 'baseline') && (
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name="Baseline"
                  stroke="#3b82f6"
                  strokeWidth={activeScenario === 'baseline' ? 3 : 2}
                  dot={false}
                />
              )}
              {(activeScenario === 'all' || activeScenario === 'pessimistic') && (
                <Line
                  type="monotone"
                  dataKey="pessimistic"
                  name="Pessimistic"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray={activeScenario === 'all' ? '5 5' : undefined}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Recommendation */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">{comparison.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
