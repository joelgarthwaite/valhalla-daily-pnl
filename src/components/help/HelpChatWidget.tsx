'use client';

import { useState, useEffect } from 'react';
import { MessageCircleQuestion, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HelpChatDialog } from './HelpChatDialog';

interface HelpChatWidgetProps {
  className?: string;
}

export function HelpChatWidget({ className }: HelpChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if help chat is available (API key configured)
  useEffect(() => {
    async function checkAvailability() {
      try {
        const response = await fetch('/api/help/chat');
        const data = await response.json();
        setIsAvailable(data.available);
      } catch {
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkAvailability();
  }, []);

  // Don't render if help is not available
  if (isLoading || !isAvailable) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <div
        className={cn(
          'fixed z-50',
          // Desktop: bottom-right corner
          // Mobile: above bottom nav (which is h-16 = 64px)
          'bottom-6 right-6 md:bottom-8 md:right-8',
          // Add extra bottom padding on mobile for bottom nav
          'max-md:bottom-20',
          className
        )}
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className={cn(
            'rounded-full shadow-lg h-14 w-14 p-0',
            'bg-primary hover:bg-primary/90',
            'transition-all duration-200',
            'hover:scale-105 active:scale-95'
          )}
          aria-label="Open help chat"
        >
          <MessageCircleQuestion className="h-6 w-6" />
        </Button>
      </div>

      {/* Chat dialog */}
      <HelpChatDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
