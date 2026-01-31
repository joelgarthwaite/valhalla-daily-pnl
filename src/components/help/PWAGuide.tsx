'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Download,
  RefreshCw,
  Menu,
  Navigation,
  Maximize2,
  Hand,
  ArrowDown,
  ArrowRight,
  Columns,
  CheckCircle,
} from 'lucide-react';

export function PWAGuide() {
  return (
    <section id="mobile-app" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Mobile App (PWA)</CardTitle>
          </div>
          <CardDescription>
            Install the dashboard on your phone for an app-like experience with offline support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <div>
            <h4 className="font-semibold mb-3">What is a PWA?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              A <strong>Progressive Web App (PWA)</strong> is a website that can be installed on your
              device and used like a native app. It runs in full-screen mode without browser chrome,
              can work offline for some features, and receives updates automatically.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Maximize2 className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Full Screen</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  No browser URL bar or navigation. Uses full device screen.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Auto Updates</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Always up to date. No app store downloads required.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Home Screen Icon</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Launch from your home screen like any other app.
                </p>
              </div>
            </div>
          </div>

          {/* Installation */}
          <div>
            <h4 className="font-semibold mb-3">Installation Instructions</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {/* iPhone */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-gray-800 text-white">iPhone</Badge>
                  <span className="text-sm font-medium">Safari Required</span>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Open <strong>Safari</strong> and go to <code className="bg-muted px-1 rounded">pnl.displaychamp.com</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Tap the <strong>Share</strong> button (square with arrow pointing up)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">4</span>
                    <span>Tap <strong>"Add"</strong> in the top right corner</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    <span>App icon appears on your home screen!</span>
                  </li>
                </ol>
              </div>

              {/* Android */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-green-600 text-white">Android</Badge>
                  <span className="text-sm font-medium">Chrome Recommended</span>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Open <strong>Chrome</strong> and go to <code className="bg-muted px-1 rounded">pnl.displaychamp.com</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Tap the <strong>three dots</strong> menu (top right)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">4</span>
                    <span>Confirm installation</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    <span>App icon appears on your home screen!</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Mobile Features */}
          <div>
            <h4 className="font-semibold mb-3">Mobile Features</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowDown className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm">Pull-to-Refresh</h5>
                  <p className="text-xs text-muted-foreground">
                    Swipe down from the top of any page to refresh data. Works on dashboard, country analysis,
                    orders, and other key pages.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Navigation className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm">Bottom Navigation</h5>
                  <p className="text-xs text-muted-foreground">
                    Fixed bottom bar for quick access to: Home, Orders, Finance, Shipping, and Admin.
                    Always visible on mobile screens.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Hand className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm">Touch Gestures</h5>
                  <p className="text-xs text-muted-foreground">
                    Swipe from the left edge to open the sidebar. Swipe left on the sidebar to close it.
                    Touch-friendly buttons with 44px minimum tap targets.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Columns className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm">Responsive Layout</h5>
                  <p className="text-xs text-muted-foreground">
                    2-column KPI grids on mobile. Compact chart legends. Abbreviated labels where needed.
                    Everything optimized for smaller screens.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Menu className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm">Collapsible Sidebar</h5>
                  <p className="text-xs text-muted-foreground">
                    On mobile, the sidebar converts to a hamburger menu. Tap the menu icon in the header
                    to access all navigation options.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PWA Details */}
          <div>
            <h4 className="font-semibold mb-3">PWA Details</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium w-1/3">App Name</td>
                    <td className="py-2 px-3 text-muted-foreground">Valhalla P&L</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">Display Mode</td>
                    <td className="py-2 px-3 text-muted-foreground">Standalone (no browser UI)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">Theme Color</td>
                    <td className="py-2 px-3 text-muted-foreground">Matches your system dark/light mode</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">Safe Areas</td>
                    <td className="py-2 px-3 text-muted-foreground">Respects iPhone notch and home indicator</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Updates</td>
                    <td className="py-2 px-3 text-muted-foreground">Automatic when you open the app</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3">Tips for Mobile Use</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                <span>Use <strong>landscape mode</strong> for charts and tables when you need more detail</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                <span>The <strong>Quick P&L Summary</strong> cards show position badges (Latest, 2, 3...) for easy identification</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                <span><strong>Tap KPI cards</strong> to see more details or navigate to related pages</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                <span>Pull down to refresh data when you need the latest figures</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
