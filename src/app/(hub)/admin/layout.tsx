'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Megaphone,
  Building2,
  Target,
  Tag,
  Calendar,
  Scale,
  RefreshCw,
  Wallet,
  ShoppingCart,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavItems = [
  {
    label: 'Order Sync',
    href: '/admin/sync',
    icon: RefreshCw,
    description: 'Sync orders from Shopify and Etsy',
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
    description: 'View and manage orders',
  },
  {
    label: 'Ad Spend',
    href: '/admin/ad-spend',
    icon: Megaphone,
    description: 'Track advertising spend across platforms',
  },
  {
    label: 'B2B Revenue',
    href: '/admin/b2b-revenue',
    icon: Building2,
    description: 'Record B2B sales and invoices',
  },
  {
    label: 'Operating Expenses',
    href: '/admin/opex',
    icon: Wallet,
    description: 'Staff, premises, software, overheads',
  },
  {
    label: 'Xero Banking',
    href: '/admin/xero',
    icon: Banknote,
    description: 'Bank account connections',
  },
  {
    label: 'Quarterly Goals',
    href: '/admin/goals',
    icon: Target,
    description: 'Set revenue and margin targets',
  },
  {
    label: 'Promotions',
    href: '/admin/promotions',
    icon: Tag,
    description: 'Manage discounts and promotions',
  },
  {
    label: 'Calendar Events',
    href: '/admin/events',
    icon: Calendar,
    description: 'Track important dates and events',
  },
  {
    label: 'Reconciliation',
    href: '/admin/reconciliation',
    icon: Scale,
    description: 'Compare revenue vs spreadsheet',
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6">
      {/* Admin Sidebar Navigation */}
      <aside className="w-56 shrink-0 border-r pr-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Admin</h2>
          <p className="text-xs text-muted-foreground">
            Manage data and settings
          </p>
        </div>
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
