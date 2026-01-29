'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  MapPin,
  BarChart3,
  TrendingUp,
  Info,
  ArrowRight,
  DollarSign,
} from 'lucide-react';

export function CountryAnalysisGuide() {
  return (
    <section id="country-analysis" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Country Analysis</CardTitle>
          </div>
          <CardDescription>
            Analyze P&L metrics by customer shipping destination to understand geographic profitability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <div>
            <h4 className="font-semibold mb-3">What It Shows</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Access via the <strong>Country Analysis</strong> button in the dashboard header, or navigate to{' '}
              <code className="bg-muted px-1 rounded">/country</code>. This page breaks down your P&L by the
              shipping destination country.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Summary Cards</h5>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Total countries shipped to</li>
                  <li>• Top country by revenue</li>
                  <li>• Domestic vs International %</li>
                  <li>• Best GP2 margin country</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Revenue Chart</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Horizontal bar chart showing top 10 countries by revenue.
                  Smaller countries aggregated into "Others".
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Country Table</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Full P&L breakdown per country with sortable columns and expandable platform details.
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Explained */}
          <div>
            <h4 className="font-semibold mb-3">Metrics Per Country</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Metric</th>
                    <th className="text-left py-2 px-3 font-medium">Definition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Revenue</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Product revenue (subtotals) shipped to that country</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Orders</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Total order count to that country</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">AOV</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Average Order Value (Revenue ÷ Orders)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">COGS</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Cost of Goods (30% of revenue)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">GP1</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Gross Profit 1 (Revenue - COGS)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Platform Fees</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Shopify (2.9% + 30p) + Etsy (6.5%)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Pick & Pack</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Fulfillment cost (5% of revenue)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Logistics</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Warehouse/handling (3% of revenue)</td>
                  </tr>
                  <tr className="border-b bg-blue-50 dark:bg-blue-950">
                    <td className="py-2 px-3 font-medium"><code className="bg-muted px-1 rounded">GP2</code></td>
                    <td className="py-2 px-3 text-muted-foreground">GP1 - Fees - Pick/Pack - Logistics</td>
                  </tr>
                  <tr className="border-b bg-blue-50 dark:bg-blue-950">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">GP2 %</code></td>
                    <td className="py-2 px-3 text-muted-foreground">GP2 margin as percentage of revenue</td>
                  </tr>
                  <tr className="border-b bg-green-50 dark:bg-green-950">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">Ad Spend</code></td>
                    <td className="py-2 px-3 text-muted-foreground">Meta ad spend by country (where ad shown)</td>
                  </tr>
                  <tr className="border-b bg-green-50 dark:bg-green-950">
                    <td className="py-2 px-3 font-medium"><code className="bg-muted px-1 rounded">GP3</code></td>
                    <td className="py-2 px-3 text-muted-foreground">GP2 - Ad Spend (when ad data available)</td>
                  </tr>
                  <tr className="bg-green-50 dark:bg-green-950">
                    <td className="py-2 px-3"><code className="bg-muted px-1 rounded">GP3 %</code></td>
                    <td className="py-2 px-3 text-muted-foreground">GP3 margin as percentage of revenue</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* GP2 vs GP3 Explanation */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              GP2 vs GP3 in Country Analysis
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              The table shows <strong>GP2</strong> by default because this represents operational profitability
              before ad spend. When Meta country ad spend data is synced, <strong>GP3</strong> columns appear.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 bg-card border rounded-lg">
                <h5 className="font-medium text-sm mb-2">GP2 (Always Available)</h5>
                <p className="text-xs text-muted-foreground">
                  Shows true operational profit by country - how much you make after all costs except ads.
                  Best for understanding which markets are operationally efficient.
                </p>
              </div>
              <div className="p-3 bg-card border rounded-lg">
                <h5 className="font-medium text-sm mb-2">GP3 (When Ad Data Synced)</h5>
                <p className="text-xs text-muted-foreground">
                  Shows contribution margin after ads. Note: Ad spend is by where the <em>ad was shown</em>,
                  not where the customer shipped to. Useful for market-level ROI analysis.
                </p>
              </div>
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h4 className="font-semibold mb-3">Data Sources</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Order Country</h5>
                <p className="text-sm text-muted-foreground">
                  From <code className="bg-muted px-1 rounded">shipping_address.country_code</code> on orders:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Shopify:</strong> Shipping address from order</li>
                  <li>• <strong>Etsy:</strong> country_iso from receipt</li>
                  <li>• <strong>B2B:</strong> Manually entered</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Ad Spend Country</h5>
                <p className="text-sm text-muted-foreground">
                  From Meta Marketing API with <code className="bg-muted px-1 rounded">breakdowns=country</code>:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Shows where ad was <strong>delivered/shown</strong></li>
                  <li>• May differ from shipping destination</li>
                  <li>• Synced daily via cron job</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How to Use */}
          <div>
            <h4 className="font-semibold mb-3">How to Use This Data</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Identify Profitable Markets</h5>
                  <p className="text-xs text-muted-foreground">
                    Sort by GP2% to find which countries have the best margins. High revenue + high GP2% = focus market.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Spot Shipping Cost Issues</h5>
                  <p className="text-xs text-muted-foreground">
                    Countries with low GP2% may have high shipping costs eating into margins. Consider shipping price increases.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Optimize Ad Targeting</h5>
                  <p className="text-xs text-muted-foreground">
                    Compare GP3 across countries. If a country has high ad spend but low GP3%, consider excluding it from targeting.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Domestic vs International Balance</h5>
                  <p className="text-xs text-muted-foreground">
                    Monitor the domestic percentage. High international % usually means higher shipping costs and longer delivery times.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
