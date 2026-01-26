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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            {subtitle && <div className="h-4 w-32 bg-muted rounded animate-pulse" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CountrySummaryCards({ summary, isLoading = false }: CountrySummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
