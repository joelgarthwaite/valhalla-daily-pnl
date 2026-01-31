'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Truck,
  Building,
  Megaphone,
  Receipt,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isThisWeek, differenceInDays } from 'date-fns';
import type { CashEvent } from '@/lib/cashflow/events';

interface CashEventsTimelineProps {
  inflows: CashEvent[];
  outflows: CashEvent[];
  onAddEvent?: () => void;
  isLoading?: boolean;
}

const eventTypeIcons: Record<string, React.ElementType> = {
  platform_payout: ShoppingBag,
  b2b_receivable: Users,
  other_inflow: ArrowUpRight,
  supplier_payment: Truck,
  opex_payment: Building,
  ad_platform_invoice: Megaphone,
  vat_payment: Receipt,
  other_outflow: MoreHorizontal,
};

const eventTypeColors: Record<string, string> = {
  platform_payout: 'text-blue-500',
  b2b_receivable: 'text-green-500',
  other_inflow: 'text-emerald-500',
  supplier_payment: 'text-orange-500',
  opex_payment: 'text-purple-500',
  ad_platform_invoice: 'text-cyan-500',
  vat_payment: 'text-red-500',
  other_outflow: 'text-gray-500',
};

const statusStyles: Record<string, string> = {
  forecast: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  paid: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function CashEventsTimeline({
  inflows,
  outflows,
  onAddEvent,
  isLoading,
}: CashEventsTimelineProps) {
  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absValue);
  };

  // Combine and sort events by date
  const allEvents = [...inflows, ...outflows]
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 15);  // Limit to 15 events

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    const daysAway = differenceInDays(date, new Date());
    if (daysAway <= 7) return format(date, 'EEEE');  // Day name
    return format(date, 'dd MMM');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-40 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Cash Events
          </CardTitle>
          {onAddEvent && (
            <Button variant="outline" size="sm" onClick={onAddEvent}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {allEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No upcoming cash events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event) => {
              const isInflow = event.amount > 0;
              const Icon = eventTypeIcons[event.event_type] || MoreHorizontal;
              const iconColor = eventTypeColors[event.event_type] || 'text-gray-500';

              return (
                <div
                  key={event.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    'hover:bg-muted/50'
                  )}
                >
                  {/* Date */}
                  <div className="w-16 flex-shrink-0 text-center">
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(event.event_date), 'dd')}
                    </div>
                    <div className="text-xs font-medium">
                      {format(parseISO(event.event_date), 'MMM')}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    isInflow ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  )}>
                    <Icon className={cn('h-5 w-5', iconColor)} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{event.description}</span>
                      {event.is_recurring && (
                        <Badge variant="outline" className="text-xs">Recurring</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getDateLabel(event.event_date)}</span>
                      <Badge className={cn('text-xs', statusStyles[event.status])}>
                        {event.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className={cn(
                    'text-right font-semibold flex-shrink-0',
                    isInflow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    <div className="flex items-center gap-1">
                      {isInflow ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {formatCurrency(event.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
