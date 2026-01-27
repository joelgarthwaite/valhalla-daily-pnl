'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LineItem {
  label: string;
  value: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  note?: string;
  formula?: string;
}

function formatCurrency(value: number): string {
  const prefix = value < 0 ? '-' : '';
  return `${prefix}£${Math.abs(value).toLocaleString()}`;
}

function CalculationLine({ item }: { item: LineItem }) {
  return (
    <div
      className={cn(
        'flex justify-between items-baseline py-1.5',
        item.indent && 'pl-6',
        item.isSubtotal && 'border-t border-muted font-medium',
        item.isTotal && 'border-t-2 border-primary font-bold text-lg bg-primary/5 -mx-4 px-4 py-2'
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className={cn(item.isTotal && 'text-primary')}>
          {item.label}
        </span>
        {item.formula && (
          <span className="text-xs text-muted-foreground font-mono">
            {item.formula}
          </span>
        )}
        {item.note && (
          <span className="text-xs text-muted-foreground">
            ({item.note})
          </span>
        )}
      </div>
      <span
        className={cn(
          'font-mono',
          item.value < 0 && 'text-red-600',
          item.value > 0 && !item.isSubtotal && !item.isTotal && 'text-green-600',
          item.isTotal && item.value > 0 && 'text-primary'
        )}
      >
        {formatCurrency(item.value)}
      </span>
    </div>
  );
}

const revenueSection: LineItem[] = [
  { label: 'PRODUCT REVENUE', value: 10000, isTotal: true },
  { label: 'Shopify', value: 7500, indent: true },
  { label: 'Etsy', value: 2000, indent: true },
  { label: 'B2B', value: 500, indent: true },
];

const shippingSection: LineItem[] = [
  { label: '+ Shipping Charged', value: 500, note: 'tracked separately' },
  { label: '= GROSS REVENUE', value: 10500, isSubtotal: true },
];

const netRevenueSection: LineItem[] = [
  { label: '- Refunds', value: -200 },
  { label: '= NET REVENUE', value: 9800, isTotal: true, note: 'basis for all margins' },
];

const gp1Section: LineItem[] = [
  { label: '- COGS', value: -2940, formula: '30% × £9,800' },
  { label: '= GP1 (Gross Profit 1)', value: 6860, isTotal: true, note: '70% margin' },
];

const gp2Section: LineItem[] = [
  { label: '- Pick & Pack', value: -490, formula: '5% × £9,800' },
  { label: '- Shopify Fees', value: -255, formula: '2.9% + £0.30/txn' },
  { label: '- Etsy Fees', value: -130, formula: '6.5% × £2,000' },
  { label: '- Logistics', value: -294, formula: '3% × £9,800' },
  { label: '= GP2 (Operating Profit)', value: 5691, isTotal: true, note: '58% margin' },
];

const gp3Section: LineItem[] = [
  { label: '- Ad Spend', value: -2000 },
  { label: '= GP3 (TRUE PROFIT)', value: 3691, isTotal: true, note: '38% net margin' },
];

const efficiencyMetrics = [
  { label: 'MER', value: '5.0x', note: '£10,000 ÷ £2,000' },
  { label: 'POAS', value: '185%', note: '£3,691 ÷ £2,000 × 100' },
  { label: 'Marketing Cost %', value: '20%', note: '£2,000 ÷ £10,000 × 100' },
  { label: 'Gross Margin', value: '70%', note: '£6,860 ÷ £9,800 × 100' },
  { label: 'Net Margin', value: '38%', note: '£3,691 ÷ £9,800 × 100' },
];

export function WorkedExample() {
  return (
    <section id="worked-example" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Worked Calculation Example</CardTitle>
          <CardDescription>
            Step-by-step P&L calculation using a £10,000 revenue day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Revenue Breakdown */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Revenue Breakdown
            </h3>
            {revenueSection.map((item, i) => (
              <CalculationLine key={i} item={item} />
            ))}
          </div>

          {/* Shipping */}
          <div className="space-y-1">
            {shippingSection.map((item, i) => (
              <CalculationLine key={i} item={item} />
            ))}
          </div>

          {/* Net Revenue */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Net Revenue
            </h3>
            {netRevenueSection.map((item, i) => (
              <CalculationLine key={i} item={item} />
            ))}
          </div>

          {/* GP1 */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              GP1 Calculation
            </h3>
            {gp1Section.map((item, i) => (
              <CalculationLine key={i} item={item} />
            ))}
          </div>

          {/* GP2 */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              GP2 Calculation
            </h3>
            {gp2Section.map((item, i) => (
              <CalculationLine key={i} item={item} />
            ))}
          </div>

          {/* GP3 */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              GP3 Calculation (Contribution)
            </h3>
            {gp3Section.map((item, i) => (
              <CalculationLine key={i} item={item} />
            ))}
          </div>

          {/* Efficiency Metrics Summary */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-4">
              Efficiency Metrics Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {efficiencyMetrics.map((m) => (
                <div key={m.label} className="text-center">
                  <div className="text-2xl font-bold text-primary">{m.value}</div>
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{m.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Insight */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Key Insight
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              On this £10,000 revenue day, after all costs including £2,000 in advertising,
              the business keeps £3,691 (38% net margin). Every £1 spent on ads generates
              £1.85 in profit (185% POAS), making marketing highly efficient at 5x MER.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
