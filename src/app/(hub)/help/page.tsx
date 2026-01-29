'use client';

import Link from 'next/link';
import { ChevronLeft, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TableOfContents,
  HelpWaterfall,
  RevenueMetricsTable,
  ProfitTiersTable,
  EfficiencyMetricsTable,
  OrderMetricsTable,
  MarginMetricsTable,
  WorkedExample,
  PlatformBreakdown,
  AdminFunctionsGuide,
  ShippingInvoicesGuide,
  XeroIntegrationGuide,
  OrderManagementGuide,
  CountryAnalysisGuide,
} from '@/components/help';

// Glossary terms
const glossaryTerms = [
  { term: 'AOV', definition: 'Average Order Value - revenue per order', link: '#order-metrics' },
  { term: 'B2B', definition: 'Business-to-Business orders (wholesale/trade)', link: '#order-management' },
  { term: 'Blended ROAS', definition: 'Return on Ad Spend across all channels (same as MER)', link: '#efficiency-metrics' },
  { term: 'COGS', definition: 'Cost of Goods Sold - direct product costs', link: '#profit-tiers' },
  { term: 'CoP', definition: 'Cost of Profit - total costs divided by GP3', link: '#efficiency-metrics' },
  { term: 'GP1', definition: 'Gross Profit 1 - Net Revenue minus COGS', link: '#profit-tiers' },
  { term: 'GP2', definition: 'Gross Profit 2 - GP1 minus operational costs', link: '#profit-tiers' },
  { term: 'GP3', definition: 'Gross Profit 3 (True Profit) - GP2 minus ad spend', link: '#profit-tiers' },
  { term: 'Gross Margin', definition: 'GP1 as a percentage of Net Revenue', link: '#margin-metrics' },
  { term: 'Gross Revenue', definition: 'Product Revenue plus Shipping Charged', link: '#revenue-metrics' },
  { term: 'MER', definition: 'Marketing Efficiency Ratio - Revenue divided by Ad Spend', link: '#efficiency-metrics' },
  { term: 'Net Margin', definition: 'GP3 as a percentage of Net Revenue', link: '#margin-metrics' },
  { term: 'Net Revenue', definition: 'Product Revenue minus Refunds', link: '#revenue-metrics' },
  { term: 'OPEX', definition: 'Operating Expenses - overhead costs (staff, rent, software)', link: '#admin-functions' },
  { term: 'POAS', definition: 'Profit on Ad Spend - (GP3 / Ad Spend) × 100', link: '#efficiency-metrics' },
  { term: 'Product Revenue', definition: 'Subtotals from all platforms (excludes shipping/tax)', link: '#revenue-metrics' },
  { term: 'ROAS', definition: 'Return on Ad Spend - Revenue divided by Ad Spend', link: '#efficiency-metrics' },
  { term: 'Shipping Margin', definition: 'Shipping charged minus actual shipping cost', link: '#shipping-analytics' },
  { term: 'True Net Profit', definition: 'GP3 minus OPEX - the bottom line', link: '#profit-tiers' },
  { term: 'Unmatched', definition: 'Invoice records that could not be auto-matched to orders', link: '#unmatched-records' },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-20 print:static">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <div className="border-l h-6" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">P&L Help Guide</h1>
                <p className="text-xs text-muted-foreground">
                  Understanding your Daily P&L Dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Table of Contents - Desktop Sidebar */}
          <TableOfContents />

          {/* Main Content */}
          <main className="flex-1 min-w-0 max-w-4xl space-y-8 print:max-w-none">
            {/* Hero Overview */}
            <section id="overview" className="scroll-mt-24">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardHeader>
                  <CardTitle className="text-3xl">Valhalla Daily P&L</CardTitle>
                  <CardDescription className="text-base">
                    A comprehensive profit & loss dashboard for Display Champ and Bright Ivy brands
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    This dashboard provides real-time visibility into your business performance across
                    Shopify, Etsy, and B2B channels. Track revenue, costs, and profitability with
                    industry-standard metrics used by CFOs and investors.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-2xl font-bold text-green-600">GP1</div>
                      <div className="text-sm text-muted-foreground">After COGS</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">GP2</div>
                      <div className="text-sm text-muted-foreground">After Ops</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-2xl font-bold text-primary">GP3</div>
                      <div className="text-sm text-muted-foreground">True Profit</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-2xl font-bold text-purple-600">MER</div>
                      <div className="text-sm text-muted-foreground">Marketing Efficiency</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="outline">Real-time sync</Badge>
                    <Badge variant="outline">Multi-platform</Badge>
                    <Badge variant="outline">Shopify + Etsy + B2B</Badge>
                    <Badge variant="outline">Meta Ads integration</Badge>
                    <Badge variant="outline">Shipping cost tracking</Badge>
                    <Badge variant="outline">Xero integration</Badge>
                    <Badge variant="outline">Country analysis</Badge>
                    <Badge variant="outline">CFO-grade metrics</Badge>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* P&L Flow Visualization */}
            <section id="pnl-flow" className="scroll-mt-24">
              <HelpWaterfall />
            </section>

            {/* KPI Definition Tables */}
            <RevenueMetricsTable />
            <ProfitTiersTable />
            <EfficiencyMetricsTable />
            <OrderMetricsTable />
            <MarginMetricsTable />

            {/* Worked Example */}
            <WorkedExample />

            {/* Platform Breakdown */}
            <PlatformBreakdown />

            {/* Shipping & Invoices Guide */}
            <ShippingInvoicesGuide />

            {/* Xero Integration */}
            <XeroIntegrationGuide />

            {/* Order Management */}
            <OrderManagementGuide />

            {/* Country Analysis */}
            <CountryAnalysisGuide />

            {/* Admin Functions */}
            <AdminFunctionsGuide />

            {/* Glossary */}
            <section id="glossary" className="scroll-mt-24">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Glossary</CardTitle>
                  <CardDescription>
                    Quick reference for all P&L terms and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {glossaryTerms.map((item) => (
                      <Link
                        key={item.term}
                        href={item.link}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                      >
                        <Badge variant="outline" className="font-mono shrink-0">
                          {item.term}
                        </Badge>
                        <span className="text-sm text-muted-foreground group-hover:text-foreground">
                          {item.definition}
                        </span>
                        <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-0 group-hover:opacity-50" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Footer */}
            <div className="text-center py-8 text-sm text-muted-foreground border-t">
              <p>
                Valhalla Daily P&L Dashboard &copy; {new Date().getFullYear()}
              </p>
              <p className="mt-1">
                Display Champ & Bright Ivy
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile TOC */}
      <TableOfContents className="lg:hidden" />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:static {
            position: static !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          aside {
            display: none !important;
          }
          button {
            display: none !important;
          }
          @page {
            margin: 1.5cm;
          }
          body {
            font-size: 11pt;
          }
          h1 {
            font-size: 18pt;
          }
          h2 {
            font-size: 14pt;
          }
          h3 {
            font-size: 12pt;
          }
        }
      `}</style>
    </div>
  );
}
