'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Building2,
  Target,
  Tag,
  Calendar,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const adminSections = [
  {
    title: 'Orders',
    description: 'View and manage orders. Tag Shopify orders as B2B.',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Ad Spend',
    description: 'Track advertising spend across Meta, Google, Microsoft, and Etsy Ads',
    href: '/admin/ad-spend',
    icon: Megaphone,
  },
  {
    title: 'B2B Revenue',
    description: 'Record B2B sales, invoices, and direct bank payments',
    href: '/admin/b2b-revenue',
    icon: Building2,
  },
  {
    title: 'Quarterly Goals',
    description: 'Set revenue targets and margin goals for each quarter',
    href: '/admin/goals',
    icon: Target,
  },
  {
    title: 'Promotions',
    description: 'Manage discounts, promo codes, and sales events',
    href: '/admin/promotions',
    icon: Tag,
  },
  {
    title: 'Calendar Events',
    description: 'Track holidays, golf tournaments, and key dates',
    href: '/admin/events',
    icon: Calendar,
  },
];

export default function AdminPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const handleRefreshData = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/pnl/refresh', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh data');
      }

      setLastRefresh(new Date().toLocaleTimeString());
      toast.success(`P&L data refreshed: ${data.recordsProcessed} records processed`);
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage manual data entry and P&L settings
          </p>
        </div>
      </div>

      {/* Refresh Data Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Refresh P&L Data
              </CardTitle>
              <CardDescription className="mt-1">
                Pull latest data from orders, shipments, ad spend, and B2B revenue to update the P&L dashboard
              </CardDescription>
            </div>
            <Button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              size="lg"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {lastRefresh && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Last refreshed at {lastRefresh}
            </p>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
