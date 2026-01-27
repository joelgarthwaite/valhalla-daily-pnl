'use client';

import { useState, useEffect } from 'react';
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

  // Separate bank accounts and credit cards
  const bankAccounts = data?.balances.filter(b => b.accountType === 'BANK') || [];
  const creditCards = data?.balances.filter(b => b.accountType === 'CREDITCARD') || [];

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
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-lg">
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

        {/* Account Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Bank Accounts */}
          {isLoading ? (
            <>
              <AccountCardSkeleton />
              <AccountCardSkeleton />
            </>
          ) : (
            bankAccounts.map((account, i) => (
              <AccountCard key={`bank-${i}`} account={account} />
            ))
          )}

          {/* Credit Cards */}
          {isLoading ? (
            <AccountCardSkeleton />
          ) : (
            creditCards.map((account, i) => (
              <AccountCard key={`card-${i}`} account={account} />
            ))
          )}
        </div>

        {/* Errors */}
        {data?.errors && data.errors.length > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-xs text-yellow-700 dark:text-yellow-400">
            {data.errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountCard({ account }: { account: BrandBalance }) {
  const isPositive = account.balance >= 0;
  const isCreditCard = account.accountType === 'CREDITCARD';

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      isCreditCard
        ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {isCreditCard ? (
            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          ) : (
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {account.brand === 'SHARED' ? 'Shared' : account.brand}
          </span>
        </div>
      </div>
      <p className={cn(
        'text-lg font-bold',
        isCreditCard
          ? isPositive
            ? 'text-green-600 dark:text-green-400' // Credit on card (unusual but possible)
            : 'text-purple-700 dark:text-purple-300' // Owed amount
          : isPositive
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-red-600 dark:text-red-400'
      )}>
        {formatCurrency(account.balance)}
      </p>
      <p className="text-xs text-muted-foreground truncate" title={account.accountName}>
        {account.accountName}
      </p>
    </div>
  );
}

function AccountCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-6 w-20 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
