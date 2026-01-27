'use client';

import { HubSidebar, HubHeader } from '@/components/layout';

export default function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <HubHeader />
      <div className="flex">
        <HubSidebar />
        <main className="flex-1 min-w-0 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
