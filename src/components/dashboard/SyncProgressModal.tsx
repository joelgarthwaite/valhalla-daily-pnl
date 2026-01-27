'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X, CloudDownload, ShoppingBag, Store, BarChart3, Calculator, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface SyncStep {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  recordsAffected?: number;
}

interface SyncResult {
  success: boolean;
  duration: string;
  steps: SyncStep[];
}

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const SYNC_STEPS = [
  { id: 'shopify', label: 'Syncing Shopify orders', icon: ShoppingBag, funMessage: 'Fetching your latest sales...' },
  { id: 'etsy', label: 'Syncing Etsy orders', icon: Store, funMessage: 'Checking the handmade marketplace...' },
  { id: 'etsy-fees', label: 'Syncing Etsy fees', icon: Receipt, funMessage: 'Tallying up the platform costs...' },
  { id: 'meta', label: 'Syncing Meta ad spend', icon: BarChart3, funMessage: 'Crunching those ad numbers...' },
  { id: 'pnl', label: 'Updating P&L calculations', icon: Calculator, funMessage: 'Calculating your profits...' },
];

const FUN_MESSAGES = [
  "Making the numbers dance...",
  "Counting all the pennies...",
  "Brewing fresh data...",
  "Waking up the spreadsheets...",
  "Convincing electrons to cooperate...",
  "Doing math so you don't have to...",
  "Finding where the money went...",
];

export function SyncProgressModal({ isOpen, onClose, onComplete }: SyncProgressModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funMessage, setFunMessage] = useState(FUN_MESSAGES[0]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setProgress(0);
      setResult(null);
      setError(null);
      startSync();
    }
  }, [isOpen]);

  // Rotate fun messages
  useEffect(() => {
    if (!isOpen || result) return;

    const interval = setInterval(() => {
      setFunMessage(FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, result]);

  // Animate progress through steps while waiting
  useEffect(() => {
    if (!isOpen || result) return;

    const stepDuration = 3000; // Estimated 3s per step
    const totalSteps = SYNC_STEPS.length;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 1;
        // Don't go past 95% until we have real results
        return next >= 95 ? 95 : next;
      });
    }, (stepDuration * totalSteps) / 95);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        return next >= totalSteps ? totalSteps - 1 : next;
      });
    }, stepDuration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [isOpen, result]);

  const startSync = async () => {
    try {
      const response = await fetch('/api/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      setResult(data);
      setProgress(100);
      setCurrentStep(SYNC_STEPS.length);

      // Call onComplete to refresh dashboard data
      if (data.success) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      setProgress(100);
    }
  };

  const getStepStatus = (index: number) => {
    if (!result) {
      if (index < currentStep) return 'complete';
      if (index === currentStep) return 'active';
      return 'pending';
    }

    // Map result steps to our display steps
    const stepMap: Record<number, string> = {
      0: 'Shopify Orders',
      1: 'Etsy Orders',
      2: 'Etsy Fees',
      3: 'Meta Ads',
      4: 'P&L Calculations',
    };

    const resultStep = result.steps.find(s => s.name === stepMap[index]);
    if (!resultStep) return 'pending';

    if (resultStep.status === 'success') return 'complete';
    if (resultStep.status === 'error') return 'error';
    if (resultStep.status === 'skipped') return 'skipped';
    return 'complete';
  };

  const getStepMessage = (index: number) => {
    if (!result) return null;

    const stepMap: Record<number, string> = {
      0: 'Shopify Orders',
      1: 'Etsy Orders',
      2: 'Etsy Fees',
      3: 'Meta Ads',
      4: 'P&L Calculations',
    };

    const resultStep = result.steps.find(s => s.name === stepMap[index]);
    return resultStep?.message || null;
  };

  const isComplete = result !== null || error !== null;
  const hasErrors = result?.steps.some(s => s.status === 'error');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isComplete && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownload className={`h-5 w-5 ${!isComplete ? 'animate-bounce' : ''}`} />
            {isComplete
              ? (error || hasErrors ? 'Sync Completed with Issues' : 'Sync Complete!')
              : 'Syncing Your Data'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {isComplete ? (
                result ? `Completed in ${result.duration}` : 'Failed'
              ) : (
                <span className="animate-pulse">{funMessage}</span>
              )}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {SYNC_STEPS.map((step, index) => {
              const status = getStepStatus(index);
              const Icon = step.icon;
              const message = getStepMessage(index);

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                    status === 'active'
                      ? 'bg-primary/10 border border-primary/20'
                      : status === 'complete'
                      ? 'bg-green-50 dark:bg-green-950/20'
                      : status === 'error'
                      ? 'bg-red-50 dark:bg-red-950/20'
                      : status === 'skipped'
                      ? 'bg-gray-50 dark:bg-gray-900/20 opacity-60'
                      : 'bg-muted/30 opacity-50'
                  }`}
                >
                  {/* Status Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    status === 'active'
                      ? 'bg-primary text-primary-foreground'
                      : status === 'complete'
                      ? 'bg-green-500 text-white'
                      : status === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-muted'
                  }`}>
                    {status === 'active' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === 'complete' ? (
                      <Check className="h-4 w-4" />
                    ) : status === 'error' ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${
                      status === 'active' ? 'text-primary' : ''
                    }`}>
                      {step.label}
                    </p>
                    {status === 'active' && !result && (
                      <p className="text-xs text-muted-foreground truncate">
                        {step.funMessage}
                      </p>
                    )}
                    {message && (
                      <p className={`text-xs truncate ${
                        status === 'error' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Close Button (only show when complete) */}
          {isComplete && (
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {hasErrors || error ? 'Close' : 'Done'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
