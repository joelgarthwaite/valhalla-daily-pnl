'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Megaphone,
  Building2,
  Target,
  Tag,
  Calendar,
  Scale,
  ArrowRight,
  Zap,
  Clock,
  User,
  Wallet,
  ShoppingCart,
  Truck,
  FileText,
  Building,
  Package,
} from 'lucide-react';

interface AdminFunction {
  icon: React.ReactNode;
  title: string;
  href: string;
  description: string;
  features: string[];
  frequency: string;
  role: 'admin' | 'editor' | 'viewer';
}

const adminFunctions: AdminFunction[] = [
  {
    icon: <RefreshCw className="h-6 w-6" />,
    title: 'Order Sync',
    href: '/admin/sync',
    description: 'Sync orders from Shopify and Etsy, then refresh P&L calculations.',
    features: [
      'Fetch orders from all connected platforms',
      'Automatic P&L recalculation after sync',
      'Date range selection for targeted sync',
      'View sync status and last sync time',
    ],
    frequency: 'Daily recommended',
    role: 'admin',
  },
  {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: 'Orders',
    href: '/admin/orders',
    description: 'View and manage all orders with sorting, B2B tagging, and exclusions.',
    features: [
      'Sortable columns (date, amount, country, etc.)',
      'Tag orders as B2B with customer name',
      'Exclude test/internal orders from P&L',
      'View shipping costs per order',
    ],
    frequency: 'As needed',
    role: 'admin',
  },
  {
    icon: <Megaphone className="h-6 w-6" />,
    title: 'Ad Spend',
    href: '/admin/ad-spend',
    description: 'Track advertising spend across Meta, Google, and other platforms.',
    features: [
      'Auto-sync from Meta Marketing API',
      'Google Ads integration (pending approval)',
      'Manual entry for other platforms',
      'View impressions, clicks, and conversions',
    ],
    frequency: 'Auto-synced daily',
    role: 'admin',
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    title: 'B2B Revenue',
    href: '/admin/b2b-revenue',
    description: 'Record wholesale and direct B2B sales with invoice tracking.',
    features: [
      'Manual entry with customer details',
      'Bulk import via JSON format',
      'Invoice number tracking',
      'Payment method recording',
    ],
    frequency: 'As invoices are raised',
    role: 'editor',
  },
  {
    icon: <Wallet className="h-6 w-6" />,
    title: 'Operating Expenses',
    href: '/admin/opex',
    description: 'Track overhead costs like staff, rent, software, and insurance.',
    features: [
      'Categorized expenses (Staff, Premises, Software, etc.)',
      'Recurring frequency (monthly, quarterly, annual)',
      'Date ranges for pro-rated allocation',
      'Auto-calculates daily OPEX for P&L',
    ],
    frequency: 'Monthly or as expenses change',
    role: 'admin',
  },
  {
    icon: <Building className="h-6 w-6" />,
    title: 'Xero Integration',
    href: '/admin/xero',
    description: 'Connect Xero for bank balances and invoice sync.',
    features: [
      'Real-time bank account balances',
      'Sync PAID invoices from Xero',
      'Approve invoices to create B2B orders',
      'Reconcile existing B2B orders with invoices',
    ],
    frequency: 'As invoices need approval',
    role: 'admin',
  },
  {
    icon: <Truck className="h-6 w-6" />,
    title: 'Shipping Analytics',
    href: '/shipping',
    description: 'Track shipping costs, margins, and carrier performance.',
    features: [
      'Revenue vs cost analysis',
      'Carrier breakdown (DHL, Royal Mail, etc.)',
      'Multiple shipments per order support',
      'Cost confidence indicators',
    ],
    frequency: 'Weekly review',
    role: 'editor',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Invoice Upload',
    href: '/shipping/invoices',
    description: 'Upload carrier invoices to allocate actual shipping costs.',
    features: [
      'DHL CSV with per-tracking costs',
      'Royal Mail CSV with date averages',
      'Preview before processing',
      'Unmatched records queue',
    ],
    frequency: 'When invoices arrive',
    role: 'admin',
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: 'Quarterly Goals',
    href: '/admin/goals',
    description: 'Set and track revenue and margin targets by quarter.',
    features: [
      'Revenue target setting',
      'Gross margin targets',
      'Net margin targets',
      'Progress tracking on dashboard',
    ],
    frequency: 'Quarterly',
    role: 'admin',
  },
  {
    icon: <Tag className="h-6 w-6" />,
    title: 'Promotions',
    href: '/admin/promotions',
    description: 'Track discount codes, sales events, and promotional campaigns.',
    features: [
      'Discount code tracking',
      'Date range for promotions',
      'Discount type (%, fixed, BOGO)',
      'Platform assignment',
    ],
    frequency: 'When running promotions',
    role: 'editor',
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: 'Calendar Events',
    href: '/admin/events',
    description: 'Track important dates, holidays, and golf tournaments.',
    features: [
      'UK/US holidays auto-imported',
      'Golf tournament dates',
      'Custom event creation',
      'Color-coded categories',
    ],
    frequency: 'Quarterly/annually',
    role: 'editor',
  },
  {
    icon: <Scale className="h-6 w-6" />,
    title: 'Reconciliation',
    href: '/admin/reconciliation',
    description: 'Compare P&L system data against external spreadsheets.',
    features: [
      'Week-by-week comparison',
      'Channel breakdown (Shopify, Etsy, B2B)',
      'Discrepancy highlighting',
      'CSV export for analysis',
    ],
    frequency: 'Weekly/monthly audits',
    role: 'admin',
  },
  {
    icon: <Package className="h-6 w-6" />,
    title: 'SKU Mapping',
    href: '/inventory/sku-mapping',
    description: 'Map legacy SKUs to current SKUs for inventory forecasting.',
    features: [
      'Discover SKUs from order history',
      'AI-powered mapping suggestions',
      'Bulk mapping with multi-select',
      'Variant grouping (P suffix, -BALL)',
    ],
    frequency: 'When SKUs change',
    role: 'admin',
  },
];

const roleColors = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export function AdminFunctionsGuide() {
  return (
    <section id="admin-functions" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admin Functions</CardTitle>
          <CardDescription>
            How to manage P&L data and settings through the admin interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {adminFunctions.map((func) => (
              <div
                key={func.title}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                    {func.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{func.title}</h3>
                      <Badge variant="outline" className={roleColors[func.role]}>
                        {func.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {func.description}
                    </p>
                  </div>
                </div>

                <ul className="text-sm space-y-1 mb-3">
                  {func.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <Zap className="h-3 w-3 mt-1.5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{func.frequency}</span>
                  </div>
                  <Link href={func.href}>
                    <Button variant="ghost" size="sm" className="h-7">
                      Open
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Role Legend */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Role Permissions
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <Badge className={roleColors.admin}>Admin</Badge>
                <p className="text-muted-foreground mt-1">
                  Full access to all settings, sync, and configuration
                </p>
              </div>
              <div>
                <Badge className={roleColors.editor}>Editor</Badge>
                <p className="text-muted-foreground mt-1">
                  Can add/edit data but cannot configure system settings
                </p>
              </div>
              <div>
                <Badge className={roleColors.viewer}>Viewer</Badge>
                <p className="text-muted-foreground mt-1">
                  Read-only access to dashboard and reports
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
