'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { CarrierBreakdownData } from '@/lib/shipping';

interface CarrierBreakdownChartProps {
  data: CarrierBreakdownData[];
}

const CARRIER_COLORS: Record<string, string> = {
  dhl: '#FFCC00',
  royalmail: '#E41B13',
};

const CARRIER_NAMES: Record<string, string> = {
  dhl: 'DHL',
  royalmail: 'Royal Mail',
};

export function CarrierBreakdownChart({ data }: CarrierBreakdownChartProps) {
  const chartData = data.map((item) => ({
    name: CARRIER_NAMES[item.carrier] || item.carrier,
    value: item.cost,
    percentage: item.percentage,
    count: item.shipmentCount,
    color: CARRIER_COLORS[item.carrier] || '#6B7280',
  }));

  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carrier Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No shipment data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Carrier Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  const entry = chartData.find(d => d.name === name);
                  const pct = entry?.percentage ?? 0;
                  return [`${formatCurrency(numValue)} (${pct.toFixed(1)}%)`, name];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{item.count} shipments</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t flex items-center justify-between font-medium">
            <span>Total</span>
            <span>{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
