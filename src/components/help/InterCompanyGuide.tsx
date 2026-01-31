'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  ArrowLeftRight,
  ArrowRight,
  DollarSign,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Info,
} from 'lucide-react';

export function InterCompanyGuide() {
  return (
    <section id="inter-company" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Inter-Company Transactions</CardTitle>
          </div>
          <CardDescription>
            Track services provided between Display Champ and Bright Ivy under their arms-length agreement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <div>
            <h4 className="font-semibold mb-3">What Are IC Transactions?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Inter-company (IC) transactions record services provided between Display Champ (DC) and Bright Ivy (BI).
              As related entities, they operate under an arms-length agreement where DC provides manufacturing,
              materials, labor, and overhead services to BI.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50 dark:bg-purple-950">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  <h5 className="font-medium">DC → BI (Provider)</h5>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Display Champ provides services to Bright Ivy
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>DC P&L Impact:</span>
                    <Badge className="bg-green-100 text-green-800">+IC Revenue</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>BI P&L Impact:</span>
                    <Badge className="bg-red-100 text-red-800">+IC Expense</Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  <h5 className="font-medium">BI → DC (Provider)</h5>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Bright Ivy provides services to Display Champ
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>BI P&L Impact:</span>
                    <Badge className="bg-green-100 text-green-800">+IC Revenue</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>DC P&L Impact:</span>
                    <Badge className="bg-red-100 text-red-800">+IC Expense</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Position in Waterfall */}
          <div>
            <h4 className="font-semibold mb-3">Position in P&L Waterfall</h4>
            <p className="text-sm text-muted-foreground mb-4">
              IC amounts appear <strong>after GP2, before Ad Spend</strong>:
            </p>

            <div className="p-4 bg-muted rounded-lg space-y-2 font-mono text-sm">
              <div className="flex items-center gap-2">
                <span className="w-32">GP2</span>
                <span className="text-muted-foreground">← Operating profit after fulfillment</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <span className="w-32">+ IC Revenue</span>
                <span className="text-muted-foreground">← Services TO sister company</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <span className="w-32">- IC Expense</span>
                <span className="text-muted-foreground">← Services FROM sister company</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <span className="w-32">- Ad Spend</span>
                <span className="text-muted-foreground">← Marketing costs</span>
              </div>
              <div className="flex items-center gap-2 font-bold border-t pt-2">
                <span className="w-32">= GP3</span>
                <span className="text-muted-foreground">← Contribution margin</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100">Group Consolidation</h5>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    IC transactions net to zero at group level. DC's IC Revenue = BI's IC Expense.
                    This is why they're tracked separately - to see true individual brand performance
                    while eliminating on consolidation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-3">Transaction Categories</h4>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">manufacturing</Badge>
                <p className="text-xs text-muted-foreground">Production and assembly services</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">materials</Badge>
                <p className="text-xs text-muted-foreground">Raw materials and components</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">labor</Badge>
                <p className="text-xs text-muted-foreground">Staff time and wages</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">overhead</Badge>
                <p className="text-xs text-muted-foreground">Facility and equipment costs</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">services</Badge>
                <p className="text-xs text-muted-foreground">General services provided</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">logistics</Badge>
                <p className="text-xs text-muted-foreground">Shipping and warehousing</p>
              </div>
              <div className="p-3 border rounded-lg col-span-2">
                <Badge variant="outline" className="mb-2">other</Badge>
                <p className="text-xs text-muted-foreground">Miscellaneous inter-company charges</p>
              </div>
            </div>
          </div>

          {/* Workflow */}
          <div>
            <h4 className="font-semibold mb-3">IC Transaction Workflow</h4>
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 text-sm p-4 bg-muted rounded-lg min-w-max">
                <Badge variant="outline">Pending</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-green-100 text-green-800">Approved</Badge>
                <span className="mx-4 text-muted-foreground">or</span>
                <Badge variant="outline">Pending</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-red-100 text-red-800">Voided</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">Pending</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created but not yet approved. Can be edited or deleted.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Approved</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirmed and included in P&L calculations.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-sm">Voided</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cancelled. Excluded from P&L. Can be reopened.
                </p>
              </div>
            </div>
          </div>

          {/* Creating IC Transactions */}
          <div>
            <h4 className="font-semibold mb-3">Creating IC Transactions</h4>
            <div className="p-4 border rounded-lg">
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                  <span>Go to <strong>Admin → Inter-Company</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                  <span>Click <strong>New Transaction</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                  <span>Select <strong>From</strong> brand (the provider)</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">4</span>
                  <span>Select <strong>To</strong> brand (the receiver)</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">5</span>
                  <span>Enter transaction date, description, category, and amount</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">6</span>
                  <span>Optionally add pricing notes (for transfer pricing audit trail)</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">7</span>
                  <span>Click <strong>Create</strong> (pending) or <strong>Create & Approve</strong></span>
                </li>
              </ol>
            </div>
          </div>

          {/* Xero Detection */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              IC Detection from Xero Invoices
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              When approving Xero invoices, the system automatically detects inter-company transactions
              based on customer name patterns.
            </p>

            <div className="p-4 border rounded-lg space-y-4">
              <div>
                <h5 className="font-medium mb-2">Detection Patterns:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>"Bright Ivy"</strong> / <strong>"BrightIvy"</strong> → DC invoicing BI</li>
                  <li>• <strong>"Display Champ"</strong> / <strong>"DisplayChamp"</strong> → BI invoicing DC</li>
                  <li>• <strong>"Valhalla"</strong> → Cross-brand transaction</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">UI Indicators:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <Badge className="bg-purple-100 text-purple-800">IC</Badge> badge appears on detected invoices</li>
                  <li>• <strong>"Approve as IC"</strong> button for pending invoices</li>
                  <li>• <strong>"Convert to IC"</strong> button for already-approved invoices</li>
                  <li>• <Badge className="bg-purple-100 text-purple-800">IC Created</Badge> shows when conversion complete</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3">Example: DC Provides £10,000 Manufacturing to BI</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 bg-card border rounded-lg">
                <h5 className="font-medium text-sm mb-2">Display Champ P&L</h5>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GP2</span>
                    <span>£50,000</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ IC Revenue</span>
                    <span>+£10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Ad Spend</span>
                    <span>-£5,000</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>GP3</span>
                    <span>£55,000</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-card border rounded-lg">
                <h5 className="font-medium text-sm mb-2">Bright Ivy P&L</h5>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GP2</span>
                    <span>£20,000</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>- IC Expense</span>
                    <span>-£10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">- Ad Spend</span>
                    <span>-£2,000</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>GP3</span>
                    <span>£8,000</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Group GP3: £55,000 + £8,000 = £63,000 (IC nets to zero on consolidation)
            </p>
          </div>

          {/* Access */}
          <div>
            <h4 className="font-semibold mb-3">Access & Location</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Admin → Inter-Company</strong> (<code className="bg-muted px-1 rounded">/admin/intercompany</code>)
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
