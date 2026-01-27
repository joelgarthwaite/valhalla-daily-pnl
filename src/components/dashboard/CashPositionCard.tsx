'use client';

import { useState, useEffect, useMemo } from 'react';
import { Building2, CreditCard, RefreshCw, AlertCircle, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BrandBalance {
  brand: string;
  brandName: string;
  accountName: string;
  accountType: 'BANK' | 'CREDITCARD';
  balance: number;
  currency: string;
}

interface BalancesResponse {
  success: boolean;
  balances: BrandBalance[];
  totals: {
    totalCash: number;
    totalCredit: number;
    netPosition: number;
  };
  lastUpdated: string;
  errors?: string[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Sort accounts: Monzo first, then Amex, then others
function sortAccounts(accounts: BrandBalance[]): BrandBalance[] {
  return [...accounts].sort((a, b) => {
    const aName = a.accountName.toLowerCase();
    const bName = b.accountName.toLowerCase();

    // Monzo accounts first
    const aIsMonzo = aName.includes('monzo');
    const bIsMonzo = bName.includes('monzo');
    if (aIsMonzo && !bIsMonzo) return -1;
    if (!aIsMonzo && bIsMonzo) return 1;

    // Then Amex accounts
    const aIsAmex = aName.includes('amex') || aName.includes('american express');
    const bIsAmex = bName.includes('amex') || bName.includes('american express');
    if (aIsAmex && !bIsAmex) return -1;
    if (!aIsAmex && bIsAmex) return 1;

    // Then alphabetically
    return aName.localeCompare(bName);
  });
}

// Calculate totals for a brand
function calculateBrandTotal(accounts: BrandBalance[]): number {
  return accounts.reduce((sum, acc) => sum + acc.balance, 0);
}

export function CashPositionCard() {
  const [data, setData] = useState<BalancesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/xero/balances');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch balances');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();

    // Refresh every 5 minutes
    const interval = setInterval(fetchBalances, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Organize accounts by brand
  const { dcAccounts, biAccounts, sharedAccounts } = useMemo(() => {
    if (!data?.balances) {
      return { dcAccounts: [], biAccounts: [], sharedAccounts: [] };
    }

    const dc = sortAccounts(data.balances.filter(b => b.brand === 'DC'));
    const bi = sortAccounts(data.balances.filter(b => b.brand === 'BI'));
    const shared = sortAccounts(data.balances.filter(b => b.brand === 'SHARED'));

    return { dcAccounts: dc, biAccounts: bi, sharedAccounts: shared };
  }, [data?.balances]);

  // No connections state
  if (!isLoading && data?.balances.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-2">Connect Bank Accounts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link your Xero account to see real-time bank balances
            </p>
            <Link href="/admin/xero">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Xero
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Unable to load bank balances</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchBalances}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dcTotal = calculateBrandTotal(dcAccounts);
  const biTotal = calculateBrandTotal(biAccounts);
  const sharedTotal = calculateBrandTotal(sharedAccounts);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-blue-600" />
            Cash Position
          </CardTitle>
          <div className="flex items-center gap-2">
            {data && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground">
                      Updated {formatTime(data.lastUpdated)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Last updated: {new Date(data.lastUpdated).toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchBalances}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total Net Position */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Position</p>
              {isLoading ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className={cn(
                  'text-2xl font-bold',
                  data?.totals.netPosition && data.totals.netPosition >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}>
                  {formatCurrency(data?.totals.netPosition || 0)}
                </p>
              )}
            </div>
            {data?.totals.netPosition !== undefined && (
              <div className={cn(
                'p-3 rounded-full',
                data.totals.netPosition >= 0
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-red-100 dark:bg-red-900/40'
              )}>
                {data.totals.netPosition >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout: DC | BI */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Display Champ Column */}
          <BrandColumn
            brandName="Display Champ"
            brandCode="DC"
            accounts={dcAccounts}
            total={dcTotal}
            isLoading={isLoading}
            colorClass="blue"
          />

          {/* Bright Ivy Column */}
          <BrandColumn
            brandName="Bright Ivy"
            brandCode="BI"
            accounts={biAccounts}
            total={biTotal}
            isLoading={isLoading}
            colorClass="emerald"
          />
        </div>

        {/* Shared Accounts (Credit Cards) */}
        {(sharedAccounts.length > 0 || isLoading) && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Shared Credit Cards
              </h4>
              {!isLoading && (
                <span className={cn(
                  'text-sm font-bold',
                  sharedTotal >= 0 ? 'text-green-600' : 'text-purple-600'
                )}>
                  {formatCurrency(sharedTotal)}
                </span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {isLoading ? (
                <>
                  <AccountCardSkeleton />
                  <AccountCardSkeleton />
                </>
              ) : (
                sharedAccounts.map((account, i) => (
                  <AccountCard key={`shared-${i}`} account={account} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Errors */}
        {data?.errors && data.errors.length > 0 && (
          <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-xs text-yellow-700 dark:text-yellow-400">
            {data.errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BrandColumn({
  brandName,
  brandCode,
  accounts,
  total,
  isLoading,
  colorClass,
}: {
  brandName: string;
  brandCode: string;
  accounts: BrandBalance[];
  total: number;
  isLoading: boolean;
  colorClass: 'blue' | 'emerald';
}) {
  const bankAccounts = accounts.filter(a => a.accountType === 'BANK');
  const creditCards = accounts.filter(a => a.accountType === 'CREDITCARD');

  const colors = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-600',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-600',
    },
  };

  const c = colors[colorClass];

  return (
    <div className={cn('rounded-lg border p-4', c.bg, c.border)}>
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className={cn('font-semibold', c.text)}>{brandName}</h4>
        {!isLoading && (
          <span className={cn(
            'text-lg font-bold',
            total >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600'
          )}>
            {formatCurrency(total)}
          </span>
        )}
      </div>

      {/* Bank Accounts */}
      <div className="space-y-2">
        {isLoading ? (
          <>
            <AccountCardSkeleton />
            <AccountCardSkeleton />
          </>
        ) : (
          <>
            {/* Monzo / Bank accounts first */}
            {bankAccounts.map((account, i) => (
              <AccountCard key={`bank-${i}`} account={account} compact />
            ))}

            {/* Credit cards for this brand */}
            {creditCards.map((account, i) => (
              <AccountCard key={`card-${i}`} account={account} compact />
            ))}

            {/* Empty state */}
            {accounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No accounts connected
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AccountCard({ account, compact = false }: { account: BrandBalance; compact?: boolean }) {
  const isPositive = account.balance >= 0;
  const isCreditCard = account.accountType === 'CREDITCARD';
  const isMonzo = account.accountName.toLowerCase().includes('monzo');
  const isAmex = account.accountName.toLowerCase().includes('amex') ||
                 account.accountName.toLowerCase().includes('american express');

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      compact ? 'p-2' : 'p-3',
      isCreditCard
        ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isCreditCard ? (
            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          ) : (
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          )}
          <span className="text-sm text-muted-foreground truncate" title={account.accountName}>
            {account.accountName}
          </span>
        </div>
        <p className={cn(
          'font-bold flex-shrink-0 ml-2',
          compact ? 'text-base' : 'text-lg',
          isCreditCard
            ? isPositive
              ? 'text-green-600 dark:text-green-400'
              : 'text-purple-700 dark:text-purple-300'
            : isPositive
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-red-600 dark:text-red-400'
        )}>
          {formatCurrency(account.balance)}
        </p>
      </div>
    </div>
  );
}

function AccountCardSkeleton() {
  return (
    <div className="p-2 rounded-lg border bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
