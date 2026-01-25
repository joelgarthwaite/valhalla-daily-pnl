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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WaterfallItem {
  name: string;
  value: number;
  formula?: string;
  description: string;
  isTotal?: boolean;
  isSubtraction?: boolean;
}

const waterfallData: WaterfallItem[] = [
  {
    name: 'Product Revenue',
    value: 10000,
    formula: 'Shopify + Etsy + B2B subtotals',
    description: 'Revenue from products only (excludes shipping/tax)',
    isTotal: true,
  },
  {
    name: 'Refunds',
    value: -200,
    formula: '- Refund amounts',
    description: 'Customer refunds and returns',
    isSubtraction: true,
  },
  {
    name: 'Net Revenue',
    value: 9800,
    formula: 'Product Revenue - Refunds',
    description: 'Revenue after returns - basis for all margins',
    isTotal: true,
  },
  {
    name: 'COGS (30%)',
    value: -2940,
    formula: '- (Net Revenue × 30%)',
    description: 'Cost of Goods Sold - product costs',
    isSubtraction: true,
  },
  {
    name: 'GP1',
    value: 6860,
    formula: 'Net Revenue - COGS',
    description: 'Gross Profit 1 - profit after product costs',
    isTotal: true,
  },
  {
    name: 'Pick & Pack',
    value: -490,
    formula: '- (Net Revenue × 5%)',
    description: 'Warehouse and fulfillment costs',
    isSubtraction: true,
  },
  {
    name: 'Platform Fees',
    value: -385,
    formula: '- (Shopify 2.9%+£0.30 + Etsy 6.5%)',
    description: 'Payment processing and marketplace fees',
    isSubtraction: true,
  },
  {
    name: 'Logistics',
    value: -294,
    formula: '- (Net Revenue × 3%)',
    description: 'Shipping and handling costs',
    isSubtraction: true,
  },
  {
    name: 'GP2',
    value: 5691,
    formula: 'GP1 - Pick&Pack - Fees - Logistics',
    description: 'Gross Profit 2 - operating profit',
    isTotal: true,
  },
  {
    name: 'Ad Spend',
    value: -2000,
    formula: '- (Meta + Google + other ads)',
    description: 'Total advertising spend',
    isSubtraction: true,
  },
  {
    name: 'GP3 (True Profit)',
    value: 3691,
    formula: 'GP2 - Ad Spend',
    description: 'Your bottom line - true profit',
    isTotal: true,
  },
];

interface ProcessedWaterfallData {
  name: string;
  value: number;
  start: number;
  end: number;
  isTotal: boolean;
  isSubtraction: boolean;
  displayValue: number;
  formula?: string;
  description: string;
}

function processWaterfallData(data: WaterfallItem[]): ProcessedWaterfallData[] {
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
      formula: item.formula,
      description: item.description,
    };
  });
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  }
  return `£${value.toLocaleString()}`;
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
    <div className="bg-background border rounded-lg shadow-lg p-4 max-w-xs">
      <p className="font-semibold text-base mb-1">{data.name}</p>
      <p className={cn(
        'text-lg font-bold mb-2',
        data.isTotal && data.displayValue >= 0 ? 'text-blue-600' :
        data.displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      )}>
        {data.displayValue >= 0 ? '' : '-'}£{Math.abs(data.displayValue).toLocaleString()}
      </p>
      {data.formula && (
        <p className="text-xs text-muted-foreground font-mono mb-1">
          {data.formula}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {data.description}
      </p>
    </div>
  );
}

export function HelpWaterfall() {
  const processedData = processWaterfallData(waterfallData);

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
        <CardTitle className="text-xl">P&L Waterfall Flow</CardTitle>
        <CardDescription>
          How revenue flows to profit through each cost layer (hover for details)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Additions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span>Subtractions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>Totals</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={processedData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              type="category"
              className="text-xs"
              interval={0}
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value)}
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

        {/* Flow summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Summary Flow:</p>
          <p className="text-sm text-muted-foreground font-mono">
            Product Revenue → - Refunds = Net Revenue → - COGS = GP1 → - Ops Costs = GP2 → - Ad Spend = GP3 (Profit)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
