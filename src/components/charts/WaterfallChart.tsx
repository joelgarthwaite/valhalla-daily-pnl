'use client';

import { useState, useEffect } from 'react';
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
}

// Abbreviated labels for mobile display
const mobileLabels: Record<string, string> = {
  'Product Revenue': 'Revenue',
  'Refunds': 'Refunds',
  'COGS (30%)': 'COGS',
  'Platform Fees': 'Fees',
  'Pick & Pack (5%)': 'P&P',
  'Logistics (3%)': 'Logistics',
  'Ad Spend': 'Ads',
  'OPEX': 'OPEX',
  'IC Revenue': 'IC Rev',
  'IC Expense': 'IC Exp',
  'True Net Profit': 'Net',
  'GP1': 'GP1',
  'GP2': 'GP2',
  'GP3': 'GP3',
};

interface WaterfallChartProps {
  data: WaterfallDataPoint[];
  isLoading?: boolean;
}

interface ProcessedWaterfallData {
  name: string;
  fullName: string; // Keep full name for tooltip
  value: number;
  start: number;
  end: number;
  isTotal: boolean;
  isSubtraction: boolean;
  displayValue: number;
}

function processWaterfallData(data: WaterfallDataPoint[], isMobile: boolean): ProcessedWaterfallData[] {
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

    // Use abbreviated label for mobile, full name for desktop
    const displayName = isMobile ? (mobileLabels[item.name] || item.name) : item.name;

    return {
      name: displayName,
      fullName: item.name, // Keep full name for tooltip
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
      <p className="font-medium mb-1">{data.fullName}</p>
      <p className={data.displayValue >= 0 ? 'text-green-600' : 'text-red-600'}>
        {data.displayValue >= 0 ? '' : '-'}{formatCurrency(Math.abs(data.displayValue))}
      </p>
    </div>
  );
}

export function WaterfallChart({ data, isLoading = false }: WaterfallChartProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 240 : 300;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">P&L Waterfall</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[240px] md:h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">P&L Waterfall</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[240px] md:h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const processedData = processWaterfallData(data, isMobile);

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
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">P&L Waterfall</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={processedData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              interval={0}
              angle={isMobile ? -60 : -45}
              textAnchor="end"
              height={isMobile ? 60 : 80}
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
