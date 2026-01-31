'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const PULL_THRESHOLD = 80; // Pixels to pull before triggering refresh
  const MAX_PULL = 120; // Maximum pull distance

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || disabled) return;

    setIsRefreshing(true);
    setPullDistance(0);
    setIsPulling(false);

    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing, disabled]);

  useEffect(() => {
    if (disabled) return;

    // Check if device supports touch
    const isTouchDevice = 'ontouchstart' in window;
    if (!isTouchDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh when scrolled to top
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 5) return; // Small threshold for momentum

      touchStartY.current = e.touches[0].clientY;
      touchCurrentY.current = e.touches[0].clientY;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 5) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      touchCurrentY.current = e.touches[0].clientY;
      const diff = touchCurrentY.current - touchStartY.current;

      if (diff > 0) {
        // Apply resistance to the pull (gets harder as you pull further)
        const resistance = 0.4;
        const distance = Math.min(diff * resistance, MAX_PULL);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }

      setIsPulling(false);
      touchStartY.current = 0;
      touchCurrentY.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, isRefreshing, pullDistance, handleRefresh, disabled]);

  // Calculate progress for visual feedback
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const isReadyToRefresh = pullDistance >= PULL_THRESHOLD;

  return (
    <div className={cn('relative', className)}>
      {/* Pull indicator - fixed at top of viewport on mobile */}
      <div
        className={cn(
          'fixed left-0 right-0 flex items-center justify-center z-50 pointer-events-none md:hidden',
          'transition-opacity duration-200',
          (pullDistance > 0 || isRefreshing) ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: isRefreshing ? 70 : Math.max(56, 56 + pullDistance - 30), // Below header (56px)
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-lg border',
            isReadyToRefresh && !isRefreshing && 'border-primary bg-primary/5'
          )}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 text-muted-foreground transition-all',
              isReadyToRefresh && 'text-primary',
              isRefreshing && 'animate-spin text-primary'
            )}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${progress * 180}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'transition-transform duration-200 md:transform-none',
          (pullDistance > 0 || isRefreshing) && 'will-change-transform'
        )}
        style={{
          transform: pullDistance > 0 || isRefreshing
            ? `translateY(${isRefreshing ? 40 : pullDistance}px)`
            : 'none',
        }}
      >
        {children}
      </div>

      {/* Refreshing text overlay */}
      {isRefreshing && (
        <div className="fixed top-24 left-0 right-0 flex justify-center z-50 pointer-events-none md:hidden">
          <span className="text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border">
            Refreshing...
          </span>
        </div>
      )}
    </div>
  );
}
