'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CloudDownload, RefreshCw, User, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SyncProgressModal } from '@/components/dashboard';

interface HubHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function HubHeader({ onRefresh, isLoading }: HubHeaderProps) {
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch with Radix UI components
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="border-b bg-card sticky top-0 z-20 h-[57px]">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Logo / Title */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">V</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Valhalla Hub</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Business Intelligence
              </p>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowSyncModal(true)}
              title="Sync orders, ad spend, and refresh P&L"
            >
              <CloudDownload className="h-4 w-4 mr-2" />
              Sync All
            </Button>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                title="Reload data from database"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}

            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {/* Notification dot - uncomment when needed */}
              {/* <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" /> */}
            </Button>

            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <span className="text-xs text-muted-foreground">
                      joel@displaychamp.com
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <SyncProgressModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onComplete={onRefresh ?? (() => {})}
      />
    </>
  );
}
