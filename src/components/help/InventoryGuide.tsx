'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Layers,
  Truck,
  FileText,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Box,
  Settings,
  TrendingUp,
  Bell,
  ShoppingCart,
} from 'lucide-react';

export function InventoryGuide() {
  return (
    <section id="inventory-management" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Inventory Management</CardTitle>
          </div>
          <CardDescription>
            Track component stock levels, manage Bill of Materials, suppliers, and purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <div>
            <h4 className="font-semibold mb-3">System Overview</h4>
            <p className="text-sm text-muted-foreground mb-4">
              The inventory system tracks individual <strong>components</strong> (bases, cases, accessories)
              rather than finished products. The <strong>Bill of Materials (BOM)</strong> defines which
              components make up each product SKU, enabling accurate stock forecasting.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Components</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Physical parts: B1/B2/B3 bases, C1/C2/C3 cases, golf tees, ring stands, packaging
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">BOM</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bill of Materials linking product SKUs to component quantities
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h5 className="font-medium">Forecasting</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Velocity calculation from sales history to predict stock needs
                </p>
              </div>
            </div>
          </div>

          {/* Stock Status Badges */}
          <div>
            <h4 className="font-semibold mb-3">Stock Status Levels</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Each component shows a status badge based on current stock, velocity (daily usage), and lead time.
            </p>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="p-3 border-2 border-green-300 rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge className="bg-green-100 text-green-800 border-green-300">OK</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stock covers more than lead time + safety buffer + 7 days
                </p>
              </div>

              <div className="p-3 border-2 border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">Warning</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stock covers lead time + safety buffer but running low
                </p>
              </div>

              <div className="p-3 border-2 border-red-300 rounded-lg bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <Badge className="bg-red-100 text-red-800 border-red-300">Critical</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stock below lead time + safety buffer. Order now!
                </p>
              </div>

              <div className="p-3 border-2 border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-950">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-gray-600" />
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300">Out of Stock</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Zero available stock. Cannot fulfill orders.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h6 className="font-medium text-sm mb-2">Status Calculation:</h6>
              <code className="text-xs block">
                velocity = units_sold_last_30_days / 30<br />
                days_remaining = available_stock / velocity<br />
                reorder_point = velocity × (lead_time + safety_days)
              </code>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold mb-3">Inventory Pages</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Package className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Stock Levels</h5>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">/inventory</code> - Main dashboard showing all component stock with status badges
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Box className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Components</h5>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">/inventory/components</code> - Create, edit, delete components with categories
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <ShoppingCart className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Product SKUs</h5>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">/inventory/product-skus</code> - Master catalog with Active/Historic/Discontinued status
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Layers className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">BOM Editor</h5>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">/inventory/bom</code> - Define which components make up each product
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Truck className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Suppliers</h5>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">/inventory/suppliers</code> - Manage suppliers with lead times, MOQ, payment terms
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <FileText className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">Purchase Orders</h5>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">/inventory/po</code> - Create and manage POs with receiving workflow
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Settings className="h-4 w-4 text-primary mt-1" />
                <div>
                  <h5 className="font-medium text-sm">SKU Mapping</h5>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">/inventory/sku-mapping</code> - Map legacy SKUs to current B-series for forecasting
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Order Workflow */}
          <div>
            <h4 className="font-semibold mb-3">Purchase Order Workflow</h4>
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 text-sm p-4 bg-muted rounded-lg min-w-max">
                <Badge variant="outline">Draft</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">Sent</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">Confirmed</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">Partial</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-green-100 text-green-800">Received</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Creating a PO</h5>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Go to <strong>Inventory → Purchase Orders</strong></li>
                  <li>2. Click <strong>Create PO</strong></li>
                  <li>3. Select supplier</li>
                  <li>4. Add line items (components + quantities)</li>
                  <li>5. Set expected delivery date</li>
                  <li>6. Save as Draft or Send</li>
                </ol>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Receiving Items</h5>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Open the PO (must be Sent or Confirmed)</li>
                  <li>2. Click <strong>Receive Items</strong></li>
                  <li>3. Enter quantities received per line</li>
                  <li>4. Click Confirm Receipt</li>
                  <li>5. Stock levels automatically updated</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Low Stock Alerts
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Automated email alerts sent daily at 7am when components need attention.
            </p>

            <div className="p-4 border rounded-lg">
              <h5 className="font-medium mb-2">Alert Triggers:</h5>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <span><strong>Out of Stock:</strong> Available quantity is zero</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span><strong>Critical:</strong> Days remaining ≤ lead time + safety days</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span><strong>Warning:</strong> Days remaining ≤ lead time + safety days + 7</span>
                </li>
              </ul>
            </div>
          </div>

          {/* SKU Mapping */}
          <div>
            <h4 className="font-semibold mb-3">SKU Mapping</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Legacy SKUs (like GBCVANTAGEP) need to be mapped to current B-series SKUs (like B1-VANT-GT-C1-P)
              for accurate velocity forecasting.
            </p>

            <div className="p-4 bg-muted rounded-lg">
              <h5 className="font-medium mb-2">How Mapping Works:</h5>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Go to <strong>Admin → SKU Mapping</strong></li>
                <li>2. View discovered SKUs from order history</li>
                <li>3. Select multiple SKUs to consolidate</li>
                <li>4. Click <strong>Map Selected</strong></li>
                <li>5. Choose the canonical (current) SKU</li>
                <li>6. Historical sales now aggregate under the current SKU</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100">Variant Handling</h5>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    SKUs ending with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">P</code> (personalized)
                    use the same components as their base SKU.
                    SKUs ending with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">-BALL</code> have different BOM
                    but are grouped for sales reporting.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Component Categories */}
          <div>
            <h4 className="font-semibold mb-3">Component Categories</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Category</th>
                    <th className="text-left py-2 px-3 font-medium">Examples</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3"><Badge variant="outline">bases</Badge></td>
                    <td className="py-2 px-3 text-muted-foreground">B1 (Small), B2 (Medium), B3 (Large) wooden/turf bases</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><Badge variant="outline">cases</Badge></td>
                    <td className="py-2 px-3 text-muted-foreground">C1, C2, C3 clear acrylic covers</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><Badge variant="outline">accessories</Badge></td>
                    <td className="py-2 px-3 text-muted-foreground">Golf Tees (GT), Ball Stems (BS), Ring Stands (RS)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3"><Badge variant="outline">packaging</Badge></td>
                    <td className="py-2 px-3 text-muted-foreground">Boxes, inserts, protective materials</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3"><Badge variant="outline">display_accessories</Badge></td>
                    <td className="py-2 px-3 text-muted-foreground">Coin stands, multi-stand packs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
