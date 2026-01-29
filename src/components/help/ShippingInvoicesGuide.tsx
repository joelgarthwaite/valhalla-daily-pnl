'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  FileText,
  Upload,
  Link2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Package,
  Layers,
} from 'lucide-react';

export function ShippingInvoicesGuide() {
  return (
    <>
      {/* Shipping Analytics Section */}
      <section id="shipping-analytics" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Shipping Analytics</CardTitle>
            </div>
            <CardDescription>
              Track shipping costs, margins, and carrier performance across all orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overview */}
            <div>
              <h4 className="font-semibold mb-2">What You'll See</h4>
              <p className="text-sm text-muted-foreground mb-4">
                The Shipping Analytics page (<code className="bg-muted px-1 rounded">/shipping</code>) shows all orders with their shipping costs,
                revenue, and margins. This helps you understand if shipping is profitable or a cost center.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Key Metrics</h5>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Shipping Revenue:</strong> What customers paid for shipping</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Shipping Cost:</strong> Actual carrier costs from invoices</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Shipping Margin:</strong> Revenue minus Cost (profit/loss)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Avg Cost per Order:</strong> Total costs / order count</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Cost Confidence</h5>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">Actual</Badge>
                      <span>From carrier invoice (exact cost)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">Estimated</Badge>
                      <span>Average cost (no invoice match yet)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs">No Cost</Badge>
                      <span>No shipment record found</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Multiple Shipments */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100">Multiple Shipments Per Order</h5>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    An order can have multiple shipments (split shipments, different carriers). When this happens:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                    <li>• The <strong>total shipping cost</strong> is the sum of all shipments</li>
                    <li>• The carrier column shows the primary carrier with a <strong>+N badge</strong> if multiple carriers</li>
                    <li>• The cost column shows <strong>(N)</strong> where N is the number of shipments</li>
                  </ul>
                  <div className="mt-3 p-2 bg-white dark:bg-blue-900 rounded text-xs">
                    <strong>Example:</strong> Order #3126 → Royal Mail £5.20 + DHL £15.80 = Total: £21.00 (2)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Invoice Processing Section */}
      <section id="invoice-processing" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Invoice Processing</CardTitle>
            </div>
            <CardDescription>
              Upload carrier invoices to allocate actual shipping costs to orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* DHL Processing */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Badge variant="outline">DHL</Badge>
                Per-Tracking Cost Allocation
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                DHL invoices contain individual tracking numbers with exact costs. Each line item is matched to a shipment.
              </p>

              <div className="p-4 border rounded-lg space-y-3">
                <h5 className="font-medium">Workflow:</h5>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Download invoice CSV from DHL portal</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Go to <strong>Shipping → Upload Invoice</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Upload the CSV file and click <strong>Analyze</strong> to preview</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">4</span>
                    <span>Review matched vs unmatched records</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">5</span>
                    <span>Click <strong>Process</strong> to update shipment costs</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Royal Mail Processing */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Badge variant="outline">Royal Mail</Badge>
                Date/Service Average Allocation
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Royal Mail invoices contain aggregated costs per day/service (no individual tracking numbers).
                Costs are distributed as averages across all shipments matching the date and service type.
              </p>

              <div className="p-4 border rounded-lg space-y-3">
                <h5 className="font-medium">How Matching Works:</h5>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Extracts daily costs by product code (TPS, TPM, MPR, MP7, SD1)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Matches shipments by <strong>ship date + service type</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Calculates average cost: Total daily cost ÷ number of shipments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Falls back to ±1 day if exact date not found</span>
                  </li>
                </ul>

                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <h6 className="font-medium text-sm mb-2">Product Code Mapping:</h6>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><code>TPS</code> → Tracked 48 (UK)</div>
                    <div><code>TPM</code> → Tracked 24 (UK)</div>
                    <div><code>SD1</code> → Special Delivery 1pm</div>
                    <div><code>MPR</code> → Intl Tracked DDP</div>
                    <div><code>MP7</code> → Intl Tracked Packet</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Old Shipments */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-amber-900 dark:text-amber-100">Old Unmatched Shipments</h5>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Shipments older than 14 days without invoice matches can have service-type averages applied.
                    Enable <strong>"Apply averages to old shipments"</strong> when processing Royal Mail CSVs to use
                    the calculated average cost for the service type.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Unmatched Records Section */}
      <section id="unmatched-records" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Unmatched Invoice Records</CardTitle>
            </div>
            <CardDescription>
              Reconcile invoice line items that couldn't be matched to orders automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Workflow */}
            <div>
              <h4 className="font-semibold mb-3">Record Status Workflow</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border-2 border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-amber-600" />
                    <Badge variant="outline" className="bg-amber-100 text-amber-800">Pending</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Needs review - no matching order found during import
                  </p>
                </div>

                <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-5 w-5 text-green-600" />
                    <Badge variant="outline" className="bg-green-100 text-green-800">Matched</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manually linked to an order - creates a new shipment
                  </p>
                </div>

                <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <Badge variant="outline" className="bg-red-100 text-red-800">Voided</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Wasted label - customer cancelled, shipping error, etc.
                  </p>
                </div>

                <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">Resolved</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Investigated and closed with notes
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="font-semibold mb-3">Available Actions</h4>
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Link to Order
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search for an order by customer name or order number. When linked:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-6 list-disc">
                    <li>Creates a new shipment record for the order</li>
                    <li>Shipment gets the tracking number and cost from the invoice</li>
                    <li>If the order already has a shipment with that tracking number, updates the existing cost</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Mark as Voided
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use when a label was printed but never used (customer cancelled, wrong address, etc.).
                    Add notes explaining why it was voided for audit purposes.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Auto-Resolve
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    Batch operation that automatically resolves records where a shipment with that tracking number
                    already exists and is linked to an order. Useful after ShipStation sync.
                  </p>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Weekly Reconciliation Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Process carrier invoices within a few days of receiving them</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Run "Auto-Resolve" after each ShipStation sync to clear stale records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Check the pending count badge on the Shipping page weekly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Document void reasons - helps identify patterns (carrier issues, address problems)</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
