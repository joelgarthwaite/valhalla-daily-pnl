'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Download,
  Calendar,
  Banknote,
  Link2,
  Unlink,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

interface XeroInvoiceLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  LineAmount: number;
}

interface XeroInvoiceRecord {
  id: string;
  brand_id: string;
  xero_invoice_id: string;
  invoice_number: string;
  contact_name: string;
  contact_email: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  currency: string;
  xero_status: string;
  approval_status: 'pending' | 'approved' | 'ignored';
  matched_order_id: string | null;
  approved_at: string | null;
  notes: string | null;
  line_items: XeroInvoiceLineItem[];
  synced_at: string;
  brand?: {
    code: string;
    name: string;
  };
}

interface StatusCounts {
  pending: number;
  approved: number;
  ignored: number;
}

// Reconciliation types
interface B2BOrder {
  id: string;
  brand_id: string;
  order_number: string | null;
  order_date: string;
  customer_name: string | null;
  b2b_customer_name: string | null;
  subtotal: number;
  total: number;
  currency: string;
  raw_data: Record<string, unknown> | null;
  brand?: { code: string; name: string };
}

interface MatchSuggestion {
  order: B2BOrder;
  invoice: XeroInvoiceRecord;
  confidence: number;
  matchReasons: string[];
}

interface ReconcileSummary {
  totalUnreconciledOrders: number;
  totalAvailableInvoices: number;
  matchSuggestionsCount: number;
  highConfidenceMatches: number;
  mediumConfidenceMatches: number;
  lowConfidenceMatches: number;
}

type ApprovalStatus = 'pending' | 'approved' | 'ignored';

interface UnmatchedTrackingRecord {
  id: string;
  tracking_number: string;
  carrier: string;
  shipping_cost: number;
  service_type: string | null;
  shipping_date: string | null;
}

const statusConfig: Record<ApprovalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  ignored: {
    label: 'Ignored',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <XCircle className="h-3 w-3" />,
  },
};

function getConfidenceBadge(confidence: number) {
  if (confidence >= 80) {
    return <Badge className="bg-green-100 text-green-800 border-green-200">High ({confidence}%)</Badge>;
  } else if (confidence >= 50) {
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium ({confidence}%)</Badge>;
  }
  return <Badge className="bg-red-100 text-red-800 border-red-200">Low ({confidence}%)</Badge>;
}

export default function XeroInvoicesPage() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState<XeroInvoiceRecord[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    approved: 0,
    ignored: 0,
  });
  const [approvedThisMonth, setApprovedThisMonth] = useState({ count: 0, value: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  // Dialog states
  const [selectedInvoice, setSelectedInvoice] = useState<XeroInvoiceRecord | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'ignore' | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [unmatchedTrackings, setUnmatchedTrackings] = useState<UnmatchedTrackingRecord[]>([]);
  const [loadingTrackings, setLoadingTrackings] = useState(false);
  const [showTrackingPicker, setShowTrackingPicker] = useState(false);

  // Sync dialog states
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncBrand, setSyncBrand] = useState('DC');
  const [syncStatus, setSyncStatus] = useState<'PAID' | 'AUTHORISED' | 'ALL'>('ALL');
  const [syncFromDate, setSyncFromDate] = useState(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [syncToDate, setSyncToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [skipDateFilter, setSkipDateFilter] = useState(false);

  // Reconciliation states
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileSummary, setReconcileSummary] = useState<ReconcileSummary | null>(null);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [unreconciledOrders, setUnreconciledOrders] = useState<B2BOrder[]>([]);
  const [availableInvoices, setAvailableInvoices] = useState<XeroInvoiceRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchSuggestion | null>(null);
  const [linkingMatch, setLinkingMatch] = useState(false);
  const [reconcileBrandFilter, setReconcileBrandFilter] = useState<string>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (brandFilter !== 'all') {
        params.set('brand', brandFilter);
      }

      const response = await fetch(`/api/xero/invoices?${params}`);
      const data = await response.json();

      if (data.invoices) {
        setInvoices(data.invoices);
        setStatusCounts(data.statusCounts);
        setApprovedThisMonth(data.approvedThisMonth);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconcileData = async () => {
    setReconcileLoading(true);
    try {
      const params = new URLSearchParams();
      if (reconcileBrandFilter !== 'all') {
        params.set('brand', reconcileBrandFilter);
      }
      params.set('minConfidence', '30'); // Lower threshold to show more options

      const response = await fetch(`/api/xero/invoices/reconcile?${params}`);
      const data = await response.json();

      if (data.success) {
        setReconcileSummary(data.summary);
        setSuggestions(data.suggestions);
        setUnreconciledOrders(data.unreconciledOrders);
        setAvailableInvoices(data.availableInvoices);
      }
    } catch (error) {
      console.error('Error fetching reconcile data:', error);
      toast.error('Failed to fetch reconciliation data');
    } finally {
      setReconcileLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [statusFilter, brandFilter, mounted, activeTab]);

  useEffect(() => {
    if (mounted && activeTab === 'reconcile') {
      fetchReconcileData();
    }
  }, [reconcileBrandFilter, mounted, activeTab]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/xero/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandCode: syncBrand,
          fromDate: syncFromDate,
          toDate: syncToDate,
          status: syncStatus,
          skipDateFilter,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Synced ${data.results.total} invoices (${data.results.new} new)`);
        setSyncDialogOpen(false);
        fetchInvoices();
        if (activeTab === 'reconcile') {
          fetchReconcileData();
        }
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing invoices:', error);
      toast.error('Failed to sync invoices');
    } finally {
      setSyncing(false);
    }
  };

  const handleAction = async () => {
    if (!selectedInvoice || !actionType) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/xero/invoices/${selectedInvoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          tracking_number: trackingNumber || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (actionType === 'approve') {
          toast.success(`B2B order created: ${data.order?.order_number}`);
        } else {
          toast.success('Invoice ignored');
        }
        closeDialog();
        fetchInvoices();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Failed to process action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkMatch = async (suggestion: MatchSuggestion) => {
    setLinkingMatch(true);
    try {
      const response = await fetch('/api/xero/invoices/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: suggestion.order.id,
          invoiceId: suggestion.invoice.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Linked order ${suggestion.order.order_number || suggestion.order.id.slice(0, 8)} to invoice ${suggestion.invoice.invoice_number}`);
        setSelectedMatch(null);
        fetchReconcileData();
      } else {
        toast.error(data.error || 'Failed to link');
      }
    } catch (error) {
      console.error('Error linking match:', error);
      toast.error('Failed to link order and invoice');
    } finally {
      setLinkingMatch(false);
    }
  };

  const closeDialog = () => {
    setSelectedInvoice(null);
    setActionType(null);
    setTrackingNumber('');
    setNotes('');
    setShowTrackingPicker(false);
    setUnmatchedTrackings([]);
  };

  const fetchUnmatchedTrackings = async () => {
    setLoadingTrackings(true);
    try {
      const response = await fetch('/api/invoices/unmatched?status=pending&limit=50');
      const data = await response.json();
      if (data.records) {
        setUnmatchedTrackings(data.records);
      }
    } catch (error) {
      console.error('Error fetching unmatched trackings:', error);
    } finally {
      setLoadingTrackings(false);
    }
  };

  const openActionDialog = (invoice: XeroInvoiceRecord, action: 'approve' | 'ignore') => {
    setSelectedInvoice(invoice);
    setActionType(action);
    // Fetch unmatched tracking numbers when approving
    if (action === 'approve') {
      fetchUnmatchedTrackings();
    }
  };

  const selectTracking = (tracking: UnmatchedTrackingRecord) => {
    setTrackingNumber(tracking.tracking_number);
    setShowTrackingPicker(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Xero Invoice Sync
          </h1>
          <p className="text-muted-foreground">
            Sync PAID invoices from Xero and approve them to create B2B orders
          </p>
        </div>
        <Button onClick={() => setSyncDialogOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Sync Invoices
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoice Approval
          </TabsTrigger>
          <TabsTrigger value="reconcile">
            <Link2 className="h-4 w-4 mr-2" />
            Reconcile B2B Orders
            {reconcileSummary && reconcileSummary.totalUnreconciledOrders > 0 && (
              <Badge variant="secondary" className="ml-2">
                {reconcileSummary.totalUnreconciledOrders}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Invoice Approval Tab */}
        <TabsContent value="invoices" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              className={`cursor-pointer transition-colors ${
                statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''
              }`}
              onClick={() => setStatusFilter('pending')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending Approval</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${
                statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''
              }`}
              onClick={() => setStatusFilter('approved')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${
                statusFilter === 'ignored' ? 'ring-2 ring-gray-500' : ''
              }`}
              onClick={() => setStatusFilter('ignored')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-600">{statusCounts.ignored}</p>
                    <p className="text-sm text-muted-foreground">Ignored</p>
                  </div>
                  <XCircle className="h-8 w-8 text-gray-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(approvedThisMonth.value)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Approved This Month ({approvedThisMonth.count})
                    </p>
                  </div>
                  <Banknote className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                <SelectItem value="DC">Display Champ</SelectItem>
                <SelectItem value="BI">Bright Ivy</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => fetchInvoices()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Invoice Table */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                PAID invoices synced from Xero - approve to create B2B orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices found</p>
                  <p className="text-sm">
                    {statusFilter === 'pending'
                      ? 'Click "Sync Invoices" to fetch from Xero'
                      : 'Try changing the filter to see more invoices.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.contact_name}</div>
                              {invoice.contact_email && (
                                <div className="text-xs text-muted-foreground">
                                  {invoice.contact_email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(invoice.subtotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {invoice.brand?.code || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${statusConfig[invoice.approval_status].color} flex items-center gap-1 w-fit`}
                            >
                              {statusConfig[invoice.approval_status].icon}
                              {statusConfig[invoice.approval_status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {invoice.approval_status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => openActionDialog(invoice, 'approve')}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openActionDialog(invoice, 'ignore')}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Ignore
                                </Button>
                              </div>
                            )}
                            {invoice.approval_status === 'approved' && invoice.notes && (
                              <span className="text-xs text-muted-foreground">{invoice.notes}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconcile Tab */}
        <TabsContent value="reconcile" className="space-y-6">
          {/* Reconciliation Info */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                B2B Order Reconciliation
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Match existing B2B orders in the system with Xero invoices. The system suggests matches based on
                amount, date, and customer name. Review the suggestions and confirm matches to link them.
              </p>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {reconcileSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{reconcileSummary.totalUnreconciledOrders}</p>
                      <p className="text-sm text-muted-foreground">Unreconciled Orders</p>
                    </div>
                    <Unlink className="h-8 w-8 text-orange-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{reconcileSummary.totalAvailableInvoices}</p>
                      <p className="text-sm text-muted-foreground">Available Invoices</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{reconcileSummary.highConfidenceMatches}</p>
                      <p className="text-sm text-muted-foreground">High Confidence</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{reconcileSummary.mediumConfidenceMatches}</p>
                      <p className="text-sm text-muted-foreground">Medium Confidence</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={reconcileBrandFilter} onValueChange={setReconcileBrandFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                <SelectItem value="DC">Display Champ</SelectItem>
                <SelectItem value="BI">Bright Ivy</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => fetchReconcileData()} disabled={reconcileLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${reconcileLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Match Suggestions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Match Suggestions</CardTitle>
              <CardDescription>
                Best match suggestions for each unreconciled B2B order - review and confirm to link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reconcileLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No match suggestions found</p>
                  <p className="text-sm">
                    {unreconciledOrders.length === 0
                      ? 'All B2B orders are already reconciled'
                      : availableInvoices.length === 0
                      ? 'No Xero invoices available to match - try syncing invoices first'
                      : 'No invoices match the unreconciled orders'}
                  </p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>B2B Order</TableHead>
                        <TableHead></TableHead>
                        <TableHead>Xero Invoice</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Match Reasons</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((suggestion, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {suggestion.order.order_number || suggestion.order.id.slice(0, 8)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {suggestion.order.b2b_customer_name || suggestion.order.customer_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(suggestion.order.order_date)} • {formatCurrency(suggestion.order.subtotal)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono text-sm font-medium">
                                {suggestion.invoice.invoice_number}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {suggestion.invoice.contact_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(suggestion.invoice.invoice_date)} • {formatCurrency(suggestion.invoice.subtotal)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getConfidenceBadge(suggestion.confidence)}
                          </TableCell>
                          <TableCell>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {suggestion.matchReasons.slice(0, 3).map((reason, i) => (
                                <li key={i}>• {reason}</li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setSelectedMatch(suggestion)}
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Link
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unreconciled Orders (without suggestions) */}
          {unreconciledOrders.length > suggestions.length && (
            <Card>
              <CardHeader>
                <CardTitle>Orders Without Matches</CardTitle>
                <CardDescription>
                  B2B orders that don&apos;t have any matching Xero invoices - may need manual review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead>Brand</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unreconciledOrders
                        .filter(order => !suggestions.find(s => s.order.id === order.id))
                        .slice(0, 10)
                        .map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_number || order.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              {order.b2b_customer_name || order.customer_name || 'Unknown'}
                            </TableCell>
                            <TableCell>{formatDate(order.order_date)}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(order.subtotal)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {order.brand?.code || 'Unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Invoices from Xero</DialogTitle>
            <DialogDescription>
              Fetch invoices from Xero for the selected brand and date range
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="syncBrand">Brand</Label>
                <Select value={syncBrand} onValueChange={setSyncBrand}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DC">Display Champ</SelectItem>
                    <SelectItem value="BI">Bright Ivy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="syncStatus">Invoice Status</Label>
                <Select value={syncStatus} onValueChange={(v) => setSyncStatus(v as 'PAID' | 'AUTHORISED' | 'ALL')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All (Recommended)</SelectItem>
                    <SelectItem value="PAID">Paid Only</SelectItem>
                    <SelectItem value="AUTHORISED">Authorised Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  AUTHORISED = sent to customer, PAID = payment received
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="syncFromDate">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="syncFromDate"
                    type="date"
                    value={syncFromDate}
                    onChange={(e) => setSyncFromDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="syncToDate">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="syncToDate"
                    type="date"
                    value={syncToDate}
                    onChange={(e) => setSyncToDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipDateFilter"
                checked={skipDateFilter}
                onCheckedChange={(checked) => setSkipDateFilter(checked === true)}
              />
              <label
                htmlFor="skipDateFilter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Fetch ALL invoices (ignore date range)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)} disabled={syncing}>
              Cancel
            </Button>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Sync Invoices
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Action Dialog */}
      <Dialog open={!!selectedInvoice && !!actionType} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Invoice & Create B2B Order' : 'Ignore Invoice'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'This will create a B2B order in the system with the Xero invoice number.'
                : 'Mark this invoice as ignored - it will not be shown in pending.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {selectedInvoice && (
              <>
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Invoice Number</div>
                      <div className="text-xl font-mono font-bold text-blue-700">
                        {selectedInvoice.invoice_number}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                      <div className="text-xl font-mono font-bold text-green-700">
                        {formatCurrency(selectedInvoice.total)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Invoice Details */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium">{selectedInvoice.contact_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{formatDate(selectedInvoice.invoice_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax:</span>
                        <span className="font-mono">{formatCurrency(selectedInvoice.tax_total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">
                        Line Items ({selectedInvoice.line_items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[60px]">Qty</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right w-[100px]">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedInvoice.line_items.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-center">
                                  {item.Quantity}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {item.Description}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(item.LineAmount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Action-specific fields */}
            <div className="space-y-4 pt-2 border-t">
              {actionType === 'approve' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="trackingNumber">Tracking Number (Optional)</Label>
                    {unmatchedTrackings.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs"
                        onClick={() => setShowTrackingPicker(!showTrackingPicker)}
                      >
                        {showTrackingPicker ? 'Hide' : 'Select from'} unmatched ({unmatchedTrackings.length})
                      </Button>
                    )}
                  </div>
                  <Input
                    id="trackingNumber"
                    placeholder="e.g., JD0123456789GB"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />

                  {/* Unmatched Tracking Picker */}
                  {showTrackingPicker && (
                    <div className="border rounded-md max-h-[200px] overflow-y-auto bg-muted/30">
                      {loadingTrackings ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Loading...
                        </div>
                      ) : unmatchedTrackings.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No unmatched tracking numbers
                        </div>
                      ) : (
                        <div className="divide-y">
                          {unmatchedTrackings.map((tracking) => (
                            <button
                              key={tracking.id}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between gap-2"
                              onClick={() => selectTracking(tracking)}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-sm font-medium truncate">
                                  {tracking.tracking_number}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span className="uppercase">{tracking.carrier}</span>
                                  {tracking.shipping_date && (
                                    <span>• {formatDate(tracking.shipping_date)}</span>
                                  )}
                                  <span>• {formatCurrency(tracking.shipping_cost)}</span>
                                </div>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-xs">
                                Select
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {trackingNumber
                      ? 'This will link the order to the shipment with this tracking number'
                      : 'Select from unmatched shipments above or enter manually'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {actionType === 'ignore' ? 'Reason for Ignoring (Required)' : 'Notes (Optional)'}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={
                    actionType === 'ignore'
                      ? 'e.g., Duplicate invoice, personal purchase, not B2B'
                      : 'Add any relevant notes...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={closeDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading || (actionType === 'ignore' && !notes.trim())}
              variant={actionType === 'approve' ? 'default' : 'secondary'}
            >
              {actionLoading ? (
                'Processing...'
              ) : actionType === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create B2B Order
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Ignore Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Match Confirmation Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Match</DialogTitle>
            <DialogDescription>
              Review the details below and confirm to link this B2B order to the Xero invoice
            </DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Order Details */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    B2B Order
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order #:</span>
                    <span className="font-mono">{selectedMatch.order.order_number || selectedMatch.order.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="truncate ml-2">{selectedMatch.order.b2b_customer_name || selectedMatch.order.customer_name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{formatDate(selectedMatch.order.order_date)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-muted-foreground font-medium">Subtotal:</span>
                    <span className="font-mono font-bold">{formatCurrency(selectedMatch.order.subtotal)}</span>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    Xero Invoice
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice #:</span>
                    <span className="font-mono">{selectedMatch.invoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact:</span>
                    <span className="truncate ml-2">{selectedMatch.invoice.contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{formatDate(selectedMatch.invoice.invoice_date)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-muted-foreground font-medium">Subtotal:</span>
                    <span className="font-mono font-bold">{formatCurrency(selectedMatch.invoice.subtotal)}</span>
                  </div>
                </div>
              </div>

              {/* Match Details */}
              <div className="bg-muted/30 rounded-lg p-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Match Confidence:</span>
                  {getConfidenceBadge(selectedMatch.confidence)}
                </div>
                <div className="text-muted-foreground">
                  <strong>Reasons:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {selectedMatch.matchReasons.map((reason, i) => (
                      <li key={i}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMatch(null)} disabled={linkingMatch}>
              Cancel
            </Button>
            <Button onClick={() => selectedMatch && handleLinkMatch(selectedMatch)} disabled={linkingMatch}>
              {linkingMatch ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Confirm & Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
