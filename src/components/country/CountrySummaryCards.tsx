'use client';

import { Globe, TrendingUp, Home, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CountrySummary } from '@/lib/pnl/country-calculations';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';

interface CountrySummaryCardsProps {
  summary: CountrySummary | null;
  isLoading?: boolean;
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  isLoading,
  className,
}: SummaryCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-6 sm:h-8 w-20 sm:w-24 bg-muted rounded animate-pulse" />
            {subtitle && <div className="h-4 w-24 sm:w-32 bg-muted rounded animate-pulse" />}
          </div>
        ) : (
          <>
            <div className="text-lg sm:text-2xl font-bold truncate">{value}</div>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CountrySummaryCards({ summary, isLoading = false }: CountrySummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
      <SummaryCard
        title="Countries Served"
        value={summary ? summary.totalCountries.toString() : '0'}
        subtitle={summary ? `${summary.totalOrders.toLocaleString()} total orders` : undefined}
        icon={<Globe className="h-4 w-4 text-blue-600" />}
        isLoading={isLoading}
      />
      <SummaryCard
        title="Top Country by Revenue"
        value={summary?.topCountryByRevenue ? formatCurrency(summary.topCountryByRevenue.revenue) : '--'}
        subtitle={
          summary?.topCountryByRevenue
            ? `${summary.topCountryByRevenue.countryFlag} ${summary.topCountryByRevenue.countryName}`
            : undefined
        }
        icon={<TrendingUp className="h-4 w-4 text-green-600" />}
        isLoading={isLoading}
      />
      <SummaryCard
        title="Domestic (UK)"
        value={summary ? formatPercentage(summary.domesticPct) : '0%'}
        subtitle={summary ? formatCurrency(summary.domesticRevenue) : undefined}
        icon={<Home className="h-4 w-4 text-purple-600" />}
        isLoading={isLoading}
      />
      <SummaryCard
        title="Top GP2 Margin"
        value={summary?.topCountryByGP2Margin ? formatPercentage(summary.topCountryByGP2Margin.gp2Margin) : '--'}
        subtitle={
          summary?.topCountryByGP2Margin
            ? `${summary.topCountryByGP2Margin.countryFlag} ${summary.topCountryByGP2Margin.countryName}`
            : undefined
        }
        icon={<Award className="h-4 w-4 text-yellow-600" />}
        isLoading={isLoading}
      />
    </div>
  );
}
