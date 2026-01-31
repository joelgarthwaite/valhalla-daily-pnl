'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { HubSidebar, HubHeader } from '@/components/layout';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleSidebarOpen = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  // Edge swipe gesture to open sidebar on mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only detect swipes starting from the left edge (within 20px)
      if (e.touches[0].clientX <= 20) {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
      } else {
        touchStartX.current = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current > 0) {
        touchCurrentX.current = e.touches[0].clientX;
      }
    };

    const handleTouchEnd = () => {
      if (touchStartX.current > 0) {
        const swipeDistance = touchCurrentX.current - touchStartX.current;
        // Swipe right from edge to open (50px threshold)
        if (swipeDistance > 50 && !sidebarOpen) {
          handleSidebarOpen();
        }
      }
      touchStartX.current = 0;
      touchCurrentX.current = 0;
    };

    // Only add listeners on mobile (check for touch support)
    if ('ontouchstart' in window) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sidebarOpen, handleSidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      <HubHeader onMenuToggle={handleMenuToggle} />
      <div className="flex">
        <HubSidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
        <main className="flex-1 min-w-0 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
