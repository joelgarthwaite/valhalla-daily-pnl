'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  BarChart3,
  ArrowRight,
  Info,
  Repeat,
} from 'lucide-react';

export function InvestorMetricsGuide() {
  return (
    <section id="investor-metrics" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Investor Metrics</CardTitle>
          </div>
          <CardDescription>
            M&A data room dashboard with TTM performance, unit economics, and cohort analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <div>
            <h4 className="font-semibold mb-3">Purpose</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Access via <strong>Finance → Investor Metrics</strong> (<code className="bg-muted px-1 rounded">/finance/investor</code>).
              This page provides the key metrics that investors and acquirers look for during due diligence,
              formatted in industry-standard ways.
            </p>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100">Headline Metrics are Always TTM</h5>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    The headline KPIs (Revenue, Gross Margin, LTV:CAC) are <strong>always</strong> calculated
                    from the Trailing 12 Months, regardless of what filter you select. This is the industry
                    standard for M&A metrics. The filter only affects charts, tables, and cohort analysis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Period Filters */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Time Period Filters
            </h4>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">All Time</Badge>
                <p className="text-xs text-muted-foreground">
                  Data from first sale to present. Best for total customer metrics.
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-primary/5">
                <Badge className="mb-2">TTM</Badge>
                <p className="text-xs text-muted-foreground">
                  Trailing 12 months. Industry standard for growth metrics.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">YTD</Badge>
                <p className="text-xs text-muted-foreground">
                  Year to date (Jan 1 to now). Good for annual planning.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">Year</Badge>
                <p className="text-xs text-muted-foreground">
                  Specific year selection. Compare year-over-year performance.
                </p>
              </div>
            </div>
          </div>

          {/* Headline Metrics */}
          <div>
            <h4 className="font-semibold mb-3">Headline Metrics (Always TTM)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Metric</th>
                    <th className="text-left py-2 px-3 font-medium">Definition</th>
                    <th className="text-left py-2 px-3 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">TTM Revenue</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Total revenue over the last 12 months</td>
                    <td className="py-2 px-3"><Badge variant="outline">Growth</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Annual Run Rate</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Last 3 months × 4 (annualized projection)</td>
                    <td className="py-2 px-3"><Badge variant="outline">Forward-looking</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Gross Margin</code></td>
                    <td className="py-2 px-3 text-muted-foreground">GP1 ÷ Revenue (after COGS)</td>
                    <td className="py-2 px-3"><Badge className="bg-green-100 text-green-800">&gt;60%</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Net Margin</code></td>
                    <td className="py-2 px-3 text-muted-foreground">True Net Profit ÷ Revenue (after OPEX)</td>
                    <td className="py-2 px-3"><Badge className="bg-green-100 text-green-800">&gt;10%</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Metrics */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Metrics (All Time)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Metric</th>
                    <th className="text-left py-2 px-3 font-medium">Definition</th>
                    <th className="text-left py-2 px-3 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Total Customers</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Unique customers who have ever ordered</td>
                    <td className="py-2 px-3">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Repeat Rate</code></td>
                    <td className="py-2 px-3 text-muted-foreground">% of customers with 2+ orders</td>
                    <td className="py-2 px-3"><Badge className="bg-green-100 text-green-800">&gt;20%</Badge></td>
                  </tr>
                  <tr className="border-b bg-purple-50 dark:bg-purple-950">
                    <td className="py-2 px-3 font-medium"><code className="bg-muted px-1 rounded">LTV</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Average lifetime value per customer (total revenue ÷ customers)</td>
                    <td className="py-2 px-3">-</td>
                  </tr>
                  <tr className="border-b bg-purple-50 dark:bg-purple-950">
                    <td className="py-2 px-3 font-medium"><code className="bg-muted px-1 rounded">CAC</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Customer Acquisition Cost (Ad Spend ÷ New Customers)</td>
                    <td className="py-2 px-3">Lower is better</td>
                  </tr>
                  <tr className="bg-purple-50 dark:bg-purple-950">
                    <td className="py-2 px-3 font-medium"><code className="bg-muted px-1 rounded">LTV:CAC</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Ratio of customer value to acquisition cost</td>
                    <td className="py-2 px-3"><Badge className="bg-green-100 text-green-800">&gt;3x</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h6 className="font-medium text-sm mb-2">Why LTV:CAC Matters</h6>
              <p className="text-sm text-muted-foreground">
                A ratio of 3x means for every £1 spent acquiring a customer, you get £3 back over their lifetime.
                Below 3x suggests marketing is too expensive; above 5x may mean underinvestment in growth.
              </p>
            </div>
          </div>

          {/* Marketing Efficiency */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Marketing Efficiency (TTM)
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">TTM Ad Spend</h5>
                <p className="text-sm text-muted-foreground">
                  Total marketing investment over the last 12 months across Meta, Google, Microsoft.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">MER</h5>
                <p className="text-sm text-muted-foreground">
                  Marketing Efficiency Ratio = Revenue ÷ Ad Spend.
                  Target: &gt;3x (for every £1 spent, generate £3+ revenue).
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">CAC Payback</h5>
                <p className="text-sm text-muted-foreground">
                  Months to recover acquisition cost.
                  Target: &lt;12 months for healthy unit economics.
                </p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Charts & Analysis
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Revenue & Profit Trend</h5>
                <p className="text-sm text-muted-foreground">
                  Monthly bar/line chart showing Revenue, GP3, and True Net Profit.
                  Spot seasonal patterns and growth trajectory.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Margin Trend</h5>
                <p className="text-sm text-muted-foreground">
                  Monthly Gross Margin and Net Margin percentages.
                  Track margin expansion or compression over time.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Customer Acquisition</h5>
                <p className="text-sm text-muted-foreground">
                  Stacked bar showing New vs Repeat customers per month.
                  Healthy businesses grow repeat customer percentage.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Monthly Table</h5>
                <p className="text-sm text-muted-foreground">
                  Detailed breakdown with MoM and YoY growth, AOV, margins.
                  Export-ready for investor data rooms.
                </p>
              </div>
            </div>
          </div>

          {/* Cohort Analysis */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Cohort Analysis
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Cohorts group customers by when they made their first purchase. This reveals:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Orders per Customer</h5>
                  <p className="text-xs text-muted-foreground">
                    How many orders each cohort places on average. Higher = better retention.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Revenue per Customer</h5>
                  <p className="text-xs text-muted-foreground">
                    Total revenue from each cohort divided by customer count. Indicates LTV by acquisition month.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Cohort Trends</h5>
                  <p className="text-xs text-muted-foreground">
                    Compare cohorts over time. Are recent customers better or worse than older ones?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Notes */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Data Notes</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Excluded orders</strong> (test orders, etc.) are automatically filtered out</li>
              <li>• Customer identification uses <strong>email address</strong> from orders</li>
              <li>• All metrics include Shopify, Etsy, and B2B channels</li>
              <li>• OPEX is included in Net Margin (True Net Profit)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
