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
import { ShoppingBag, Store, Building2, Megaphone, Search, Palette, ShoppingCart } from 'lucide-react';

interface Platform {
  name: string;
  icon: React.ReactNode;
  type: 'revenue' | 'ads';
  feeStructure: string;
  revenueField?: string;
  dataSource?: string;
  notes?: string;
}

const revenuePlatforms: Platform[] = [
  {
    name: 'Shopify',
    icon: <ShoppingBag className="h-5 w-5 text-green-600" />,
    type: 'revenue',
    feeStructure: '2.9% + £0.30/transaction',
    revenueField: 'subtotal_price',
    dataSource: 'Automated sync via API',
    notes: 'Primary DTC channel. Uses subtotal_price for revenue (excludes shipping/tax).',
  },
  {
    name: 'Etsy',
    icon: <Palette className="h-5 w-5 text-orange-500" />,
    type: 'revenue',
    feeStructure: '~6.5% (transaction + processing)',
    revenueField: 'subtotal',
    dataSource: 'Automated sync via API',
    notes: 'Marketplace channel. Uses subtotal for revenue (excludes shipping/tax).',
  },
  {
    name: 'B2B',
    icon: <Building2 className="h-5 w-5 text-blue-600" />,
    type: 'revenue',
    feeStructure: '0% (no platform fees)',
    revenueField: 'Manual entry',
    dataSource: 'Manual entry via admin',
    notes: 'Wholesale and direct sales. Entered manually with invoice details.',
  },
];

const adPlatforms: Platform[] = [
  {
    name: 'Meta (Facebook/Instagram)',
    icon: <Megaphone className="h-5 w-5 text-blue-500" />,
    type: 'ads',
    feeStructure: 'Variable (CPM/CPC based)',
    dataSource: 'Auto-synced via Marketing API',
    notes: 'Primary ad platform. Syncs daily spend, impressions, clicks, conversions.',
  },
  {
    name: 'Google Ads',
    icon: <Search className="h-5 w-5 text-red-500" />,
    type: 'ads',
    feeStructure: 'Variable (CPC/CPM based)',
    dataSource: 'Auto-synced via Google Ads API',
    notes: 'Search and display ads. Requires Basic Access approval for automated sync.',
  },
  {
    name: 'Etsy Ads',
    icon: <ShoppingCart className="h-5 w-5 text-orange-500" />,
    type: 'ads',
    feeStructure: 'CPC (varies by listing)',
    dataSource: 'Manual entry',
    notes: 'Etsy promoted listings. Currently entered manually.',
  },
];

const costBreakdown = [
  { category: 'COGS', rate: '30%', basis: 'Net Revenue', description: 'Cost of Goods Sold - product costs', configurable: true },
  { category: 'Pick & Pack', rate: '5%', basis: 'Net Revenue', description: 'Warehouse fulfillment costs', configurable: true },
  { category: 'Logistics', rate: '3%', basis: 'Net Revenue', description: 'Shipping and handling', configurable: true },
  { category: 'Shopify Fees', rate: '2.9% + £0.30', basis: 'Per transaction', description: 'Payment processing fees', configurable: false },
  { category: 'Etsy Fees', rate: '6.5%', basis: 'Transaction value', description: 'Marketplace + processing fees', configurable: false },
];

export function PlatformBreakdown() {
  return (
    <section id="platforms" className="scroll-mt-24 space-y-6">
      {/* Revenue Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Revenue Sources</CardTitle>
          <CardDescription>
            Where revenue comes from and how it's tracked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenuePlatforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <div className="p-2 bg-muted rounded-lg shrink-0">
                  {platform.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{platform.name}</h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {platform.feeStructure}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {platform.notes}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {platform.revenueField && (
                      <span>
                        <strong>Revenue Field:</strong>{' '}
                        <code className="bg-muted px-1 rounded">{platform.revenueField}</code>
                      </span>
                    )}
                    <span>
                      <strong>Data Source:</strong> {platform.dataSource}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ad Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Advertising Platforms</CardTitle>
          <CardDescription>
            Where ad spend is tracked from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <div className="p-2 bg-muted rounded-lg shrink-0">
                  {platform.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{platform.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {platform.notes}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Data Source:</strong> {platform.dataSource}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Cost Structure</CardTitle>
          <CardDescription>
            Default cost percentages used in P&L calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cost Category</TableHead>
                <TableHead>Default Rate</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Configurable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costBreakdown.map((cost) => (
                <TableRow key={cost.category}>
                  <TableCell className="font-medium">{cost.category}</TableCell>
                  <TableCell className="font-mono">{cost.rate}</TableCell>
                  <TableCell className="text-muted-foreground">{cost.basis}</TableCell>
                  <TableCell className="text-sm">{cost.description}</TableCell>
                  <TableCell>
                    {cost.configurable ? (
                      <Badge variant="default" className="bg-green-600">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">Fixed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-sm text-muted-foreground">
            <strong>Note:</strong> Configurable costs can be adjusted per brand in the Cost Configuration settings.
            Platform fees are calculated based on actual transaction fees.
          </p>
        </CardContent>
      </Card>

      {/* Revenue Definition Callout */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
        <CardHeader>
          <CardTitle className="text-lg text-amber-900 dark:text-amber-100">
            Important: Revenue Definition
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
          <p>
            <strong>Product Revenue</strong> uses subtotals only (excludes shipping and tax) to ensure
            apples-to-apples comparison across Shopify and Etsy.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Shopify:</strong> Uses <code className="bg-amber-200/50 px-1 rounded">subtotal_price</code> (line items after discounts)</li>
            <li><strong>Etsy:</strong> Uses <code className="bg-amber-200/50 px-1 rounded">subtotal</code> (total_price minus coupon discounts)</li>
            <li><strong>Shipping:</strong> Tracked separately in <code className="bg-amber-200/50 px-1 rounded">shipping_charged</code></li>
          </ul>
          <p>
            This ensures consistent margin calculations regardless of which platform the order came from.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
