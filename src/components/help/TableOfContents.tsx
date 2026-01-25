'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TOCSection {
  id: string;
  title: string;
  level: number;
}

const sections: TOCSection[] = [
  { id: 'overview', title: 'Overview', level: 1 },
  { id: 'pnl-flow', title: 'P&L Flow', level: 1 },
  { id: 'revenue-metrics', title: 'Revenue Metrics', level: 1 },
  { id: 'profit-tiers', title: 'Profit Tiers (GP1/GP2/GP3)', level: 1 },
  { id: 'efficiency-metrics', title: 'Efficiency Metrics', level: 1 },
  { id: 'order-metrics', title: 'Order Metrics', level: 1 },
  { id: 'margin-metrics', title: 'Margin Metrics', level: 1 },
  { id: 'worked-example', title: 'Worked Calculation', level: 1 },
  { id: 'platforms', title: 'Platform Breakdown', level: 1 },
  { id: 'admin-functions', title: 'Admin Functions', level: 1 },
  { id: 'glossary', title: 'Glossary', level: 1 },
];

interface TableOfContentsProps {
  className?: string;
}

export function TableOfContents({ className }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => ({
        id: s.id,
        element: document.getElementById(s.id),
      }));

      const scrollPosition = window.scrollY + 120;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section.element && section.element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveSection(id);
      if (isMobile) setIsExpanded(false);
    }
  };

  // Mobile collapsible TOC
  if (isMobile) {
    return (
      <div className={cn('lg:hidden fixed bottom-4 right-4 z-50', className)}>
        {isExpanded && (
          <div className="bg-card border rounded-lg shadow-lg mb-2 max-h-[60vh] overflow-y-auto">
            <div className="p-4">
              <p className="text-sm font-semibold text-muted-foreground mb-3">
                Contents
              </p>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'block w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                      activeSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground'
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          size="icon"
          className="rounded-full shadow-lg h-12 w-12"
        >
          {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
    );
  }

  // Desktop sticky sidebar
  return (
    <aside className={cn('hidden lg:block w-64 shrink-0', className)}>
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="pr-4">
          <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
            Contents
          </p>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'block w-full text-left px-3 py-2 text-sm rounded-md transition-all',
                  section.level === 2 && 'pl-6 text-xs',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {section.title}
              </button>
            ))}
          </nav>

          {/* Print button */}
          <div className="mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.print()}
            >
              Print Guide
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
