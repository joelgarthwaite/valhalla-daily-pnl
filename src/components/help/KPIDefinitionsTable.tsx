'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MetricDefinition {
  metric: string;
  formula: string;
  definition: string;
  target?: string;
}

const revenueMetrics: MetricDefinition[] = [
  {
    metric: 'Product Revenue',
    formula: 'Shopify + Etsy + B2B subtotals',
    definition: 'Revenue from products only (excludes shipping and tax). Primary P&L metric for consistent cross-platform comparison.',
  },
  {
    metric: 'Shipping Charged',
    formula: 'Sum of shipping fees',
    definition: 'Amount charged to customers for shipping. Tracked separately for shipping margin analysis.',
  },
  {
    metric: 'Gross Revenue',
    formula: 'Product Revenue + Shipping',
    definition: 'Total customer payments excluding tax. What customers actually paid.',
  },
  {
    metric: 'Net Revenue',
    formula: 'Product Revenue - Refunds',
    definition: 'Revenue after returns. This is the basis for all margin calculations.',
  },
];

const profitTiers: MetricDefinition[] = [
  {
    metric: 'GP1 (Gross Profit 1)',
    formula: 'Net Revenue - COGS',
    definition: 'Profit after cost of goods sold. Shows product profitability before operating costs.',
    target: '~70% of Net Revenue',
  },
  {
    metric: 'GP2 (Gross Profit 2)',
    formula: 'GP1 - Pick&Pack - Fees - Logistics',
    definition: 'Operating profit after fulfillment costs. Shows business profitability before marketing.',
    target: '55-60% of Net Revenue',
  },
  {
    metric: 'GP3 (True Profit)',
    formula: 'GP2 - Ad Spend',
    definition: 'Your bottom line - true profit after all costs including advertising. THE KEY METRIC.',
    target: '>25% Net Margin',
  },
];

const efficiencyMetrics: MetricDefinition[] = [
  {
    metric: 'POAS',
    formula: '(GP3 / Ad Spend) × 100',
    definition: 'Profit on Ad Spend. Shows how much profit each £1 of ad spend generates. 200% = £2 profit per £1 spent.',
    target: '>200%',
  },
  {
    metric: 'MER',
    formula: 'Revenue / Ad Spend',
    definition: 'Marketing Efficiency Ratio. Total revenue generated per £1 of ad spend across all channels.',
    target: '>3x',
  },
  {
    metric: 'Blended ROAS',
    formula: 'Revenue / Total Ad Spend',
    definition: 'Return on Ad Spend blended across all channels. Same as MER - different terminology.',
    target: '>3x',
  },
  {
    metric: 'Marketing Cost %',
    formula: '(Ad Spend / Revenue) × 100',
    definition: 'Ad spend as a percentage of revenue. Shows how much of revenue goes to advertising.',
    target: '<33%',
  },
  {
    metric: 'CoP',
    formula: 'Total Costs / GP3',
    definition: 'Cost of Profit. How much it costs to generate £1 of profit. Lower is better.',
    target: '<3x',
  },
];

const orderMetrics: MetricDefinition[] = [
  {
    metric: 'Gross AOV',
    formula: '(Product Revenue + Shipping) / Orders',
    definition: 'Average Order Value including shipping. What customers pay per order on average.',
  },
  {
    metric: 'Net AOV',
    formula: '(Product Revenue - Discounts) / Orders',
    definition: 'Average Order Value after discounts. Actual product value earned per order.',
  },
  {
    metric: 'Orders',
    formula: 'Count of all orders',
    definition: 'Total number of orders across Shopify, Etsy, and B2B channels.',
  },
];

const marginMetrics: MetricDefinition[] = [
  {
    metric: 'Gross Margin %',
    formula: '(GP1 / Net Revenue) × 100',
    definition: 'Percentage of revenue remaining after COGS. Shows product-level profitability.',
    target: '>65%',
  },
  {
    metric: 'Net Margin %',
    formula: '(GP3 / Net Revenue) × 100',
    definition: 'Percentage of revenue remaining as profit. Your bottom-line efficiency.',
    target: '>25%',
  },
  {
    metric: 'Shipping Margin',
    formula: 'Shipping Charged - Shipping Cost',
    definition: 'Profit or loss on shipping. Tracked separately, not in GP flow.',
    target: '≥£0',
  },
];

interface MetricsTableProps {
  id: string;
  title: string;
  description?: string;
  metrics: MetricDefinition[];
  showTarget?: boolean;
}

function MetricsTable({ id, title, description, metrics, showTarget = false }: MetricsTableProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] whitespace-normal">Metric</TableHead>
                <TableHead className="w-[180px] whitespace-normal">Formula</TableHead>
                <TableHead className="whitespace-normal">Definition</TableHead>
                {showTarget && <TableHead className="w-[100px] whitespace-normal">Target</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.metric}>
                  <TableCell className="font-medium whitespace-normal align-top">{m.metric}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground whitespace-normal align-top">
                    {m.formula}
                  </TableCell>
                  <TableCell className="text-sm whitespace-normal align-top">{m.definition}</TableCell>
                  {showTarget && (
                    <TableCell className="align-top">
                      {m.target && (
                        <Badge variant="outline" className="font-mono whitespace-nowrap">
                          {m.target}
                        </Badge>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

export function RevenueMetricsTable() {
  return (
    <MetricsTable
      id="revenue-metrics"
      title="Revenue Metrics"
      description="How revenue is measured and broken down across platforms"
      metrics={revenueMetrics}
    />
  );
}

export function ProfitTiersTable() {
  return (
    <MetricsTable
      id="profit-tiers"
      title="Profit Tiers (GP1 / GP2 / GP3)"
      description="The three-tier profit calculation showing profit at each stage"
      metrics={profitTiers}
      showTarget
    />
  );
}

export function EfficiencyMetricsTable() {
  return (
    <MetricsTable
      id="efficiency-metrics"
      title="Efficiency Metrics"
      description="Marketing and operational efficiency measurements"
      metrics={efficiencyMetrics}
      showTarget
    />
  );
}

export function OrderMetricsTable() {
  return (
    <MetricsTable
      id="order-metrics"
      title="Order Metrics"
      description="Order volume and average order value measurements"
      metrics={orderMetrics}
    />
  );
}

export function MarginMetricsTable() {
  return (
    <MetricsTable
      id="margin-metrics"
      title="Margin Metrics"
      description="Profitability percentages at different levels"
      metrics={marginMetrics}
      showTarget
    />
  );
}
