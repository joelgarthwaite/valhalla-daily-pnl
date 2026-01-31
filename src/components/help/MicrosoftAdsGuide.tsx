'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Monitor,
  RefreshCw,
  Link2,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  DollarSign,
  BarChart3,
} from 'lucide-react';

export function MicrosoftAdsGuide() {
  return (
    <section id="microsoft-ads" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Microsoft Ads (Bing)</CardTitle>
          </div>
          <CardDescription>
            Sync ad spend from Microsoft Advertising (formerly Bing Ads) into your P&L
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <div>
            <h4 className="font-semibold mb-3">Overview</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Microsoft Advertising (Bing Ads) spend is automatically synced alongside Meta and Google
              to provide a complete picture of your marketing investment. The spend appears in Total Ad Spend
              and affects GP3, POAS, and MER calculations.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Connected Accounts</h5>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span><strong>Display Champ:</strong> Account 151932843</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span><strong>Bright Ivy:</strong> Pending setup (no spend yet)</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Data Synced</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Daily spend amounts</li>
                  <li>• Impressions</li>
                  <li>• Clicks</li>
                  <li>• Conversions</li>
                  <li>• Revenue attributed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h4 className="font-semibold mb-3">How Sync Works</h4>
            <div className="p-4 bg-muted rounded-lg">
              <ol className="text-sm space-y-2">
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                  <span>Daily cron job runs at <strong>7am and 7pm UTC</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                  <span>Fetches last 7 days of data via Microsoft Reporting API</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                  <span>Data saved to <code className="bg-card px-1 rounded">ad_spend</code> table with source="microsoft"</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">4</span>
                  <span>P&L refresh includes Microsoft spend in Total Ad Spend</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Manual Sync */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Manual Sync
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              To manually sync Microsoft Ads data, go to <strong>Admin → Ad Spend</strong>
              and click the <strong>Sync</strong> button, or trigger via API:
            </p>
            <div className="p-3 bg-muted rounded-lg font-mono text-xs">
              POST /api/microsoft/sync<br />
              Body: {`{ "brandCode": "DC", "startDate": "2026-01-01", "endDate": "2026-01-31" }`}
            </div>
          </div>

          {/* OAuth */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              OAuth Connection
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              If the refresh token expires or is revoked, you'll need to re-authenticate:
            </p>

            <div className="p-4 border rounded-lg space-y-3">
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                  <span>Visit <code className="bg-muted px-1 rounded">/api/microsoft/auth</code> to start OAuth flow</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                  <span>Sign in with <strong>microsoft@displaychamp.com</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                  <span>Authorize the Display Champ Advertising Integration app</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">4</span>
                  <span>Callback returns new refresh token</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">5</span>
                  <span>Update <code className="bg-muted px-1 rounded">MICROSOFT_REFRESH_TOKEN</code> in Vercel environment variables</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">6</span>
                  <span>Redeploy the app to apply changes</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Token Management */}
          <div>
            <h4 className="font-semibold mb-3">Token Management</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium w-1/3">Access Token</td>
                    <td className="py-2 px-3 text-muted-foreground">Expires in ~1 hour (auto-refreshed)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">Refresh Token</td>
                    <td className="py-2 px-3 text-muted-foreground">Long-lived (until revoked)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Client Secret</td>
                    <td className="py-2 px-3 text-muted-foreground">Expires <strong>31/01/2028</strong> (regenerate before)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Where It Appears */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Where Microsoft Spend Appears
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Dashboard KPIs</h5>
                  <p className="text-xs text-muted-foreground">
                    Included in Total Ad Spend, affecting GP3, POAS, and MER calculations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Ad Spend Admin Page</h5>
                  <p className="text-xs text-muted-foreground">
                    Listed with source="microsoft" alongside Meta and Google entries
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Daily Summary Email</h5>
                  <p className="text-xs text-muted-foreground">
                    Combined in Total Ad Spend figures in morning and evening emails
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Revenue vs Ad Spend Chart</h5>
                  <p className="text-xs text-muted-foreground">
                    Microsoft spend included in the blended ad spend line
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-amber-900 dark:text-amber-100">Troubleshooting</h5>
                <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 space-y-1">
                  <li>• <strong>401 Error:</strong> Refresh token expired - re-authenticate via OAuth flow</li>
                  <li>• <strong>No data:</strong> Check account has spend in the date range</li>
                  <li>• <strong>Wrong account:</strong> Verify account IDs in environment variables</li>
                  <li>• <strong>API errors:</strong> Check Microsoft Ads API status page</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
