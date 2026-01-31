'use client';

import { useState, useCallback } from 'react';
import { HubSidebar, HubHeader } from '@/components/layout';

export default function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <HubHeader onMenuToggle={handleMenuToggle} />
      <div className="flex">
        <HubSidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
        <main className="flex-1 min-w-0 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
