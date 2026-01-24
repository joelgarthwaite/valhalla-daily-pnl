'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/pnl/targets';
import type { ROASByChannel } from '@/types';

interface ROASChartProps {
  data: ROASByChannel[];
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ROASByChannel;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{data.platformName}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Spend:</span>
          <span>{formatCurrency(data.spend)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Revenue (Attributed):</span>
          <span>{formatCurrency(data.revenueAttributed)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">ROAS:</span>
          <span className={data.roas >= 1 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {data.roas.toFixed(2)}x
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">MER:</span>
          <span className={data.mer >= 1 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {data.mer.toFixed(2)}x
          </span>
        </div>
      </div>
    </div>
  );
}

export function ROASChart({ data, isLoading = false }: ROASChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROAS by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROAS by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No ad spend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format for chart display
  const chartData = data.map((d) => ({
    ...d,
    name: d.platformName.split(' ')[0], // Use short name for X axis
  }));

  const getBarColor = (roas: number) => {
    if (roas >= 3) return '#22c55e'; // Green - excellent
    if (roas >= 2) return '#84cc16'; // Lime - good
    if (roas >= 1) return '#eab308'; // Yellow - break even
    return '#ef4444'; // Red - losing money
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROAS by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis
              tickFormatter={(value) => `${value}x`}
              className="text-xs"
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Break-even reference line */}
            <ReferenceLine
              y={1}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: 'Break Even', position: 'right', className: 'text-xs' }}
            />
            {/* Target ROAS reference line */}
            <ReferenceLine
              y={3}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{ value: 'Target', position: 'right', className: 'text-xs' }}
            />
            <Bar dataKey="roas" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.roas)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Excellent (3x+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-lime-500" />
            <span>Good (2-3x)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Break Even (1-2x)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Losing (&lt;1x)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
