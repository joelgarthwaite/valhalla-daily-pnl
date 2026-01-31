'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { CashAlert } from '@/lib/cashflow/calculations';

interface CashAlertBannerProps {
  alerts: CashAlert[];
  onDismiss?: (index: number) => void;
}

const alertConfig = {
  critical: {
    icon: AlertTriangle,
    variant: 'destructive' as const,
    className: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  },
  warning: {
    icon: AlertCircle,
    variant: 'default' as const,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
  },
  info: {
    icon: Info,
    variant: 'default' as const,
    className: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
  },
};

export function CashAlertBanner({ alerts, onDismiss }: CashAlertBannerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());

  if (alerts.length === 0) return null;

  const visibleAlerts = alerts.filter((_, idx) => !dismissedIndices.has(idx));

  if (visibleAlerts.length === 0) return null;

  const handleDismiss = (index: number) => {
    setDismissedIndices(prev => new Set([...prev, index]));
    onDismiss?.(index);
  };

  // Sort by severity
  const sortedAlerts = [...visibleAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.type] - order[b.type];
  });

  return (
    <div className="space-y-2">
      {sortedAlerts.map((alert, idx) => {
        const config = alertConfig[alert.type];
        const Icon = config.icon;
        const originalIndex = alerts.indexOf(alert);
        const isExpanded = expandedIndex === originalIndex;

        return (
          <Alert
            key={originalIndex}
            variant={config.variant}
            className={cn(config.className, 'relative')}
          >
            <Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between pr-8">
              <span>{alert.title}</span>
              <div className="flex items-center gap-1">
                {alert.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setExpandedIndex(isExpanded ? null : originalIndex)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </AlertTitle>
            <AlertDescription className="mt-1">
              {alert.message}
              {isExpanded && alert.action && (
                <div className="mt-2 p-2 bg-background/50 rounded text-sm">
                  <strong>Recommended action:</strong> {alert.action}
                </div>
              )}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => handleDismiss(originalIndex)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </Alert>
        );
      })}
    </div>
  );
}
