'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/pnl/targets';
import type { WaterfallDataPoint } from '@/types';

interface WaterfallChartProps {
  data: WaterfallDataPoint[];
  isLoading?: boolean;
}

interface ProcessedWaterfallData {
  name: string;
  value: number;
  start: number;
  end: number;
  isTotal: boolean;
  isSubtraction: boolean;
  displayValue: number;
}

function processWaterfallData(data: WaterfallDataPoint[]): ProcessedWaterfallData[] {
  let runningTotal = 0;

  return data.map((item) => {
    const start = item.isTotal ? 0 : runningTotal;
    const end = item.isTotal ? Math.abs(item.value) : runningTotal + item.value;
    const displayValue = item.value;

    if (!item.isTotal) {
      runningTotal = end;
    } else {
      runningTotal = item.value;
    }

    return {
      name: item.name,
      value: item.value,
      start: Math.min(start, end),
      end: Math.max(start, end),
      isTotal: item.isTotal || false,
      isSubtraction: item.isSubtraction || false,
      displayValue,
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ProcessedWaterfallData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{data.name}</p>
      <p className={data.displayValue >= 0 ? 'text-green-600' : 'text-red-600'}>
        {data.displayValue >= 0 ? '' : '-'}{formatCurrency(Math.abs(data.displayValue))}
      </p>
    </div>
  );
}

export function WaterfallChart({ data, isLoading = false }: WaterfallChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Waterfall</CardTitle>
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
          <CardTitle>P&L Waterfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const processedData = processWaterfallData(data);

  const getBarColor = (entry: ProcessedWaterfallData) => {
    if (entry.isTotal) {
      return entry.value >= 0 ? '#3b82f6' : '#ef4444';
    }
    if (entry.isSubtraction) {
      return '#ef4444';
    }
    return '#22c55e';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L Waterfall</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={processedData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              type="category"
              className="text-xs"
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value, 'GBP', true)}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#666" />

            {/* Invisible bar for positioning */}
            <Bar dataKey="start" stackId="waterfall" fill="transparent" />

            {/* Visible bar */}
            <Bar dataKey={(d: ProcessedWaterfallData) => d.end - d.start} stackId="waterfall">
              {processedData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
