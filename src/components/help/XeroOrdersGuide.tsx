'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  FileCheck,
  Link2,
  Ban,
  RotateCcw,
  DollarSign,
  Search,
  ShoppingCart,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';

export function XeroIntegrationGuide() {
  return (
    <section id="xero-integration" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Xero Integration</CardTitle>
          </div>
          <CardDescription>
            Connect Xero for bank balances and B2B invoice management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bank Balances */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Bank Balances
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Real-time bank account balances are displayed on the main dashboard in the Cash Position card.
              Balances auto-refresh every 5 minutes.
            </p>

            <div className="p-4 border rounded-lg">
              <h5 className="font-medium mb-2">Connected Accounts:</h5>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>Monzo DC</strong> - Display Champ business account</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>Monzo BI</strong> - Bright Ivy business account</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>Amex Gold</strong> - Shared credit card (shown once as "Shared")</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Invoice Sync */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              B2B Invoice Approval
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Sync PAID invoices from Xero and approve them to automatically create B2B orders in the P&L system.
            </p>

            <div className="p-4 border rounded-lg space-y-4">
              <div>
                <h5 className="font-medium mb-2">Invoice Approval Workflow:</h5>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Go to <strong>Admin → Xero Invoices</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Click <strong>Sync Invoices</strong> to fetch from Xero</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Review pending invoices in the queue</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">4</span>
                    <span><strong>Approve:</strong> Creates B2B order with invoice number as order number</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">5</span>
                    <span><strong>Ignore:</strong> Dismisses invoice with reason (won't create order)</span>
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <h6 className="font-medium text-sm mb-2">Tracking Number Options:</h6>
                <p className="text-sm text-muted-foreground">
                  When approving, you can optionally add a tracking number:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Select from <strong>unmatched invoice records</strong> (DHL invoices)</li>
                  <li>• Select from <strong>unlinked shipments</strong> (Royal Mail, etc.)</li>
                  <li>• Enter a tracking number <strong>manually</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Invoice Reconciliation */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              B2B Order Reconciliation
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Match existing B2B orders with Xero invoices using intelligent confidence scoring.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 border-2 border-green-300 rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">High (≥80%)</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Strong match - likely correct. Amount and date closely match.
                </p>
              </div>
              <div className="p-3 border-2 border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-800">Medium (50-79%)</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Probable match - review recommended before linking.
                </p>
              </div>
              <div className="p-3 border-2 border-red-300 rounded-lg bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-red-100 text-red-800">Low (&lt;50%)</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Weak match - careful manual review needed.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h6 className="font-medium text-sm mb-2">Matching Algorithm:</h6>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Amount Match (60pts):</strong> Exact = 60, within 1% = 50, within 5% = 30</li>
                <li>• <strong>Date Proximity (25pts):</strong> Same day = 25, within 3 days = 20, within 7 days = 15</li>
                <li>• <strong>Customer Name (15pts):</strong> Exact = 15, partial = 10, word overlap = 5</li>
              </ul>
            </div>
          </div>

          {/* Important Note */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-blue-900 dark:text-blue-100">Important: Order Dates</h5>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  B2B orders created from Xero invoices use the <strong>invoice date</strong> (not the approval date).
                  Adjust date filters on the Orders page to see recently approved B2B orders that may have older invoice dates.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function OrderManagementGuide() {
  return (
    <section id="order-management" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Order Management</CardTitle>
          </div>
          <CardDescription>
            View, filter, sort, and manage all orders from Shopify, Etsy, and B2B channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Orders Page Features */}
          <div>
            <h4 className="font-semibold mb-3">Orders Page Features</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Access via <strong>Admin → Orders</strong> (<code className="bg-muted px-1 rounded">/admin/orders</code>)
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Sortable Columns</h5>
                <p className="text-sm text-muted-foreground">
                  Click any column header to sort. Click again to reverse order.
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Date (default: newest first)</li>
                  <li>• Order Number</li>
                  <li>• Customer Name</li>
                  <li>• Country</li>
                  <li>• Brand / Platform</li>
                  <li>• Amount (subtotal)</li>
                  <li>• B2B Status</li>
                  <li>• Shipping Cost</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Filters</h5>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>Search by customer, order number, email</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Brand</Badge>
                    <span>All, Display Champ, Bright Ivy</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Status</Badge>
                    <span>Active Only, Excluded Only, All</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Shipping Cost Column */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Shipping Cost Column
            </h4>
            <p className="text-sm text-muted-foreground">
              Shows the total shipping cost for each order. When an order has multiple shipments:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Cost is summed across all shipments</li>
              <li>• Shows carrier badges (e.g., <Badge variant="outline" className="text-xs">RM</Badge> <Badge variant="outline" className="text-xs">DHL</Badge>)</li>
              <li>• Displays shipment count when &gt;1</li>
            </ul>
          </div>

          {/* B2B Tagging */}
          <div>
            <h4 className="font-semibold mb-3">B2B Order Tagging</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Tag orders as B2B (wholesale/trade) directly from the Orders page. B2B orders:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Are tracked separately in revenue breakdowns</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Include customer name for reporting</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Can be reconciled with Xero invoices</span>
              </li>
            </ul>

            <div className="p-4 border rounded-lg">
              <h5 className="font-medium mb-2">To tag an order as B2B:</h5>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Find the order in the list</li>
                <li>2. Click the <Badge variant="outline" className="text-xs">B2B</Badge> toggle in the B2B column</li>
                <li>3. Enter the customer/business name</li>
                <li>4. Click Save</li>
              </ol>
            </div>
          </div>

          {/* Order Exclusions */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              Excluding Orders
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently exclude test orders, duplicates, or internal orders from P&L calculations.
              Excluded orders are 100% removed from all metrics.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border border-red-200 rounded-lg">
                <h5 className="font-medium flex items-center gap-2 mb-2">
                  <Ban className="h-4 w-4 text-red-500" />
                  Exclude an Order
                </h5>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Find the order in the list</li>
                  <li>2. Click the <strong>Exclude</strong> button</li>
                  <li>3. Enter a reason (e.g., "Test order")</li>
                  <li>4. Click Confirm</li>
                  <li>5. Run <strong>Sync & Update</strong> to refresh P&L</li>
                </ol>
              </div>

              <div className="p-4 border border-green-200 rounded-lg">
                <h5 className="font-medium flex items-center gap-2 mb-2">
                  <RotateCcw className="h-4 w-4 text-green-500" />
                  Restore an Order
                </h5>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Set Status filter to "Excluded Only"</li>
                  <li>2. Find the order</li>
                  <li>3. Click the <strong>Restore</strong> button</li>
                  <li>4. Run <strong>Sync & Update</strong> to refresh P&L</li>
                </ol>
              </div>
            </div>

            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-red-900 dark:text-red-100">What Gets Excluded</h5>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    Excluded orders are removed from:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-200 mt-2 space-y-1">
                    <li>• Main P&L calculations (daily_pnl)</li>
                    <li>• Country Analysis</li>
                    <li>• Reconciliation reports</li>
                    <li>• Order sync (won't be re-imported)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
