'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Building2,
  Target,
  Tag,
  Calendar,
  ChevronLeft,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const adminNavItems = [
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <div className="border-l h-6" />
            <div>
              <h1 className="text-lg font-semibold">Admin</h1>
              <p className="text-xs text-muted-foreground">
                Manage P&L data and settings
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-64 shrink-0">
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
      </div>
    </div>
  );
}
