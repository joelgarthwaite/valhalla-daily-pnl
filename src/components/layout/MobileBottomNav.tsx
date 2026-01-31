'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Truck,
  Package,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: LayoutDashboard,
    matchPaths: ['/'],
  },
  {
    label: 'P&L',
    href: '/pnl',
    icon: TrendingUp,
    matchPaths: ['/pnl', '/pnl/country', '/pnl/detailed', '/finance'],
  },
  {
    label: 'Shipping',
    href: '/shipping',
    icon: Truck,
    matchPaths: ['/shipping'],
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: Package,
    matchPaths: ['/inventory'],
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: Settings,
    matchPaths: ['/admin'],
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.href === '/') {
      return pathname === '/';
    }
    return item.matchPaths?.some(path =>
      pathname === path || pathname.startsWith(path + '/')
    );
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-full h-full px-2 py-2 transition-colors',
                'active:bg-muted/50',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5',
                active && 'stroke-[2.5]'
              )} />
              <span className={cn(
                'text-[10px] leading-none',
                active ? 'font-semibold' : 'font-medium'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
