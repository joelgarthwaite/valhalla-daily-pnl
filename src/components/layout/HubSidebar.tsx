'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Truck,
  Target,
  Wallet,
  Globe,
  Settings,
  HelpCircle,
  BarChart3,
  LineChart,
  Users,
  Building,
  Package,
  Boxes,
  Link2,
  Tag,
  FileText,
  Layers,
  Building2,
  ClipboardList,
  ArrowRightLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Hub Home',
        href: '/',
        icon: LayoutDashboard,
        description: 'Overview dashboard',
      },
    ],
  },
  {
    title: 'Financial',
    items: [
      {
        label: 'P&L Dashboard',
        href: '/pnl',
        icon: TrendingUp,
        description: 'Daily profit & loss',
      },
      {
        label: 'Country Analysis',
        href: '/pnl/country',
        icon: Globe,
        description: 'P&L by destination',
      },
      {
        label: 'Detailed P&L',
        href: '/pnl/detailed',
        icon: BarChart3,
        description: 'Full breakdown',
      },
      {
        label: 'Investor Metrics',
        href: '/finance/investor',
        icon: LineChart,
        description: 'M&A data room',
      },
      {
        label: 'Cash Flow',
        href: '/finance/cashflow',
        icon: Wallet,
        description: 'Projections & runway',
        badge: 'Soon',
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Shipping',
        href: '/shipping',
        icon: Truck,
        description: 'Carrier costs & margins',
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        label: 'Stock Levels',
        href: '/inventory',
        icon: Package,
        description: 'Current inventory status',
      },
      {
        label: 'Components',
        href: '/inventory/components',
        icon: Boxes,
        description: 'Component management',
      },
      {
        label: 'Product SKUs',
        href: '/inventory/product-skus',
        icon: Tag,
        description: 'Master SKU catalog',
      },
      {
        label: 'BOM Editor',
        href: '/inventory/bom',
        icon: Layers,
        description: 'Product components',
      },
      {
        label: 'SKU Mapping',
        href: '/inventory/sku-mapping',
        icon: Link2,
        description: 'Legacy SKU mapping',
      },
      {
        label: 'Suppliers',
        href: '/inventory/suppliers',
        icon: Building2,
        description: 'Vendor management',
      },
      {
        label: 'Purchase Orders',
        href: '/inventory/po',
        icon: ClipboardList,
        description: 'PO management',
      },
    ],
  },
  {
    title: 'Strategy',
    items: [
      {
        label: 'EOS',
        href: '/eos',
        icon: Target,
        description: 'Rocks, Scorecard, L10',
        badge: 'Soon',
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        label: 'Xero Invoices',
        href: '/admin/xero/invoices',
        icon: FileText,
        description: 'B2B invoice approval',
      },
      {
        label: 'Inter-Company',
        href: '/admin/intercompany',
        icon: ArrowRightLeft,
        description: 'DC ↔ BI transactions',
      },
      {
        label: 'Admin Settings',
        href: '/admin',
        icon: Settings,
        description: 'Settings & data entry',
      },
      {
        label: 'Help',
        href: '/help',
        icon: HelpCircle,
        description: 'Documentation',
      },
    ],
  },
];

// Collect all nav hrefs for matching logic
const allNavHrefs = navSections.flatMap(section =>
  section.items.map(item => item.href)
);

interface HubSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function HubSidebar({ isOpen, onClose }: HubSidebarProps) {
  const pathname = usePathname();

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [pathname, onClose]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }

    // Exact match
    if (pathname === href) {
      return true;
    }

    // Check if pathname starts with this href
    if (pathname.startsWith(href + '/') || pathname.startsWith(href)) {
      // But only if there's no more specific nav item that matches
      const hasMoreSpecificMatch = allNavHrefs.some(
        navHref => navHref !== href &&
                   navHref.startsWith(href) &&
                   (pathname === navHref || pathname.startsWith(navHref + '/'))
      );
      return !hasMoreSpecificMatch;
    }

    return false;
  };

  const sidebarContent = (
    <>
      <nav className="p-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const disabled = item.badge === 'Soon';

                return (
                  <Link
                    key={item.href}
                    href={disabled ? '#' : item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : disabled
                        ? 'text-muted-foreground/50 cursor-not-allowed'
                        : 'hover:bg-muted text-foreground'
                    )}
                    onClick={(e) => {
                      if (disabled) e.preventDefault();
                    }}
                  >
                    <item.icon className={cn(
                      'h-4 w-4',
                      active ? '' : disabled ? 'opacity-50' : ''
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(disabled && 'opacity-50')}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className={cn(
                            'px-1.5 py-0.5 text-[10px] rounded font-medium',
                            item.badge === 'Soon'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary/10 text-primary'
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Brand Logos at Bottom */}
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-4 px-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building className="h-3 w-3" />
            <span>Display Champ</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>Bright Ivy</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 border-r bg-card h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-card border-r transform transition-transform duration-300 ease-in-out md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">V</span>
            </div>
            <span className="font-bold">Valhalla Hub</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-65px)]">
          {sidebarContent}
        </div>
      </aside>
    </>
  );
}
