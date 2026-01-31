'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  Building2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/pnl/targets';
import type {
  InterCompanyTransaction,
  InterCompanyCategory,
  InterCompanyStatus,
  Brand
} from '@/types';
import { IC_CATEGORY_LABELS, IC_STATUS_LABELS } from '@/types';

const CATEGORIES: InterCompanyCategory[] = [
  'manufacturing',
  'materials',
  'labor',
  'overhead',
  'services',
  'logistics',
  'other',
];

export default function InterCompanyPage() {
  const [transactions, setTransactions] = useState<InterCompanyTransaction[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InterCompanyStatus | 'all'>('all');
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Summary stats
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    voided: 0,
    totalApprovedValue: 0,
    totalPendingValue: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    from_brand_id: '',
    to_brand_id: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    category: '' as InterCompanyCategory | '',
    subtotal: '',
    tax: '0',
    pricing_notes: '',
    notes: '',
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/intercompany');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.transactions || []);
      setBrands(data.brands || []);
      setSummary(data.summary || {
        total: 0,
        pending: 0,
        approved: 0,
        voided: 0,
        totalApprovedValue: 0,
        totalPendingValue: 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load inter-company transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (filterStatus === 'all') return transactions;
    return transactions.filter((t) => t.status === filterStatus);
  }, [transactions, filterStatus]);

  const resetForm = () => {
    setFormData({
      from_brand_id: '',
      to_brand_id: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      category: '',
      subtotal: '',
      tax: '0',
      pricing_notes: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.from_brand_id || !formData.to_brand_id || !formData.description ||
        !formData.category || !formData.subtotal) {
      toast.error('Please fill in required fields');
      return;
    }

    if (formData.from_brand_id === formData.to_brand_id) {
      toast.error('From and To brands must be different');
      return;
    }

    try {
      const payload = {
        from_brand_id: formData.from_brand_id,
        to_brand_id: formData.to_brand_id,
        transaction_date: formData.transaction_date,
        description: formData.description,
        category: formData.category,
        subtotal: parseFloat(formData.subtotal),
        tax: parseFloat(formData.tax) || 0,
        pricing_notes: formData.pricing_notes || null,
        notes: formData.notes || null,
      };

      let response;
      if (editingId) {
        response = await fetch('/api/intercompany', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        response = await fetch('/api/intercompany', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save transaction');
      }

      toast.success(editingId ? 'Transaction updated' : 'Transaction created');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save transaction');
    }
  };

  const handleEdit = (transaction: InterCompanyTransaction) => {
    setFormData({
      from_brand_id: transaction.from_brand_id,
      to_brand_id: transaction.to_brand_id,
      transaction_date: transaction.transaction_date,
      description: transaction.description,
      category: transaction.category,
      subtotal: transaction.subtotal.toString(),
      tax: transaction.tax.toString(),
      pricing_notes: transaction.pricing_notes || '',
      notes: transaction.notes || '',
    });
    setEditingId(transaction.id);
    setIsDialogOpen(true);
  };

  const handleAction = async (id: string, action: 'approve' | 'void' | 'reopen') => {
    try {
      const response = await fetch('/api/intercompany', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} transaction`);
      }

      toast.success(`Transaction ${action}ed`);
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing transaction:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} transaction`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await fetch(`/api/intercompany?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  };

  const handleRefreshPnL = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/pnl/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 90 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh P&L');
      }

      toast.success(`P&L refreshed: ${data.recordsProcessed} records updated`);
    } catch (error) {
      console.error('Error refreshing P&L:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh P&L');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getBrandName = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.name || 'Unknown';
  };

  const getBrandCode = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.code || '??';
  };

  const getStatusBadge = (status: InterCompanyStatus) => {
    const variants: Record<InterCompanyStatus, { className: string }> = {
      pending: { className: 'bg-amber-100 text-amber-700' },
      approved: { className: 'bg-green-100 text-green-700' },
      voided: { className: 'bg-gray-100 text-gray-700' },
    };

    return (
      <Badge className={variants[status].className}>
        {IC_STATUS_LABELS[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inter-Company Transactions</h2>
          <p className="text-muted-foreground">
            Track service charges between Display Champ and Bright Ivy
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshPnL}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh P&L
          </Button>
          {mounted ? (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit' : 'Add'} Inter-Company Transaction</DialogTitle>
                  <DialogDescription>
                    Record service charges between DC and BI
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {/* From / To Brands */}
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-2 space-y-2">
                      <Label>From (Provider) *</Label>
                      <Select
                        value={formData.from_brand_id || undefined}
                        onValueChange={(v) => setFormData({ ...formData, from_brand_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name} ({brand.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-center pb-2">
                      <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>To (Receiver) *</Label>
                      <Select
                        value={formData.to_brand_id || undefined}
                        onValueChange={(v) => setFormData({ ...formData, to_brand_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name} ({brand.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Input
                      placeholder="e.g., Manufacturing services Q1 2026"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Category and Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={formData.category || undefined}
                        onValueChange={(v) => setFormData({ ...formData, category: v as InterCompanyCategory })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {IC_CATEGORY_LABELS[category]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction Date *</Label>
                      <Input
                        type="date"
                        value={formData.transaction_date}
                        onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (NET of VAT) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 1000.00"
                        value={formData.subtotal}
                        onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>VAT (if applicable)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.tax}
                        onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Pricing Notes */}
                  <div className="space-y-2">
                    <Label>Transfer Pricing Notes</Label>
                    <Textarea
                      placeholder="Justification for pricing (for audit trail)..."
                      value={formData.pricing_notes}
                      onChange={(e) => setFormData({ ...formData, pricing_notes: e.target.value })}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      placeholder="Any other relevant information..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingId ? 'Update' : 'Create'} Transaction
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(summary.totalPendingValue)} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(summary.totalApprovedValue)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Voided
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summary.voided}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cancelled transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How IC Works */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How Inter-Company Transactions Affect P&L
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              When DC provides services to BI (e.g., manufacturing), the transaction creates:
            </p>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4" />
                  <strong>Display Champ (DC)</strong>
                </div>
                <p>+IC Revenue (increases GP3)</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4" />
                  <strong>Bright Ivy (BI)</strong>
                </div>
                <p>+IC Expense (decreases GP3)</p>
              </div>
            </div>
            <p className="mt-3 text-xs">
              IC amounts appear between GP2 and Ad Spend in the P&L waterfall.
              Click &quot;Refresh P&L&quot; after approving transactions to update the dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter by status:</Label>
        {mounted ? (
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as InterCompanyStatus | 'all')}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="w-[200px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            All Statuses
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No inter-company transactions yet. Click &quot;Add Transaction&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className={tx.status === 'voided' ? 'opacity-50' : ''}>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>
                      {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{getBrandCode(tx.from_brand_id)}</Badge>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline">{getBrandCode(tx.to_brand_id)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{IC_CATEGORY_LABELS[tx.category]}</span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px]">
                        <div className="font-medium truncate">{tx.description}</div>
                        {tx.xero_invoice_number && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {tx.xero_invoice_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tx.subtotal)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {tx.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(tx.id, 'approve')}
                              title="Approve"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(tx.id, 'void')}
                              title="Void"
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(tx)}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tx.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {tx.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(tx.id, 'reopen')}
                            title="Reopen"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {tx.status === 'voided' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(tx.id, 'reopen')}
                            title="Reopen"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Migration Helper */}
      <MigrationHelper brands={brands} onMigrated={fetchData} />
    </div>
  );
}

// Migration Helper Component
function MigrationHelper({
  brands,
  onMigrated,
}: {
  brands: Brand[];
  onMigrated: () => void;
}) {
  const [candidates, setCandidates] = useState<{
    candidateOrders: Array<{
      id: string;
      brand_id: string;
      order_date: string;
      order_number: string;
      customer_name: string;
      b2b_customer_name: string;
      subtotal: number;
      brand?: Brand;
      source: 'orders';
    }>;
    candidateRevenue: Array<{
      id: string;
      brand_id: string;
      date: string;
      customer_name: string;
      subtotal: number;
      notes: string;
      brand?: Brand;
      source: 'b2b_revenue';
    }>;
    summary: {
      ordersCount: number;
      revenueCount: number;
      ordersTotal: number;
      revenueTotal: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertDialog, setConvertDialog] = useState<{
    source: 'orders' | 'b2b_revenue';
    sourceId: string;
    date: string;
    amount: number;
    customerName: string;
  } | null>(null);
  const [convertForm, setConvertForm] = useState({
    from_brand_id: '',
    to_brand_id: '',
    category: 'manufacturing' as InterCompanyCategory,
    description: '',
    exclude_original: true,
  });

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/intercompany/candidates');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch candidates');
      }
      setCandidates(data);
      setIsExpanded(true);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load B2B candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!convertDialog || !convertForm.from_brand_id || !convertForm.to_brand_id) {
      toast.error('Please select both From and To brands');
      return;
    }

    setConvertingId(convertDialog.sourceId);
    try {
      const response = await fetch('/api/intercompany/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: convertDialog.source,
          source_id: convertDialog.sourceId,
          from_brand_id: convertForm.from_brand_id,
          to_brand_id: convertForm.to_brand_id,
          category: convertForm.category,
          description: convertForm.description || `Migrated: ${convertDialog.customerName}`,
          exclude_original: convertForm.exclude_original,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert');
      }

      toast.success('Converted to IC transaction');
      setConvertDialog(null);
      fetchCandidates(); // Refresh the list
      onMigrated(); // Refresh parent
    } catch (error) {
      console.error('Error converting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to convert');
    } finally {
      setConvertingId(null);
    }
  };

  const openConvertDialog = (
    source: 'orders' | 'b2b_revenue',
    sourceId: string,
    date: string,
    amount: number,
    customerName: string,
    brandId: string
  ) => {
    // Auto-detect the direction based on which brand the B2B order belongs to
    // If the order is under DC and customer is "Bright Ivy", then DC → BI
    const dcBrand = brands.find(b => b.code === 'DC');
    const biBrand = brands.find(b => b.code === 'BI');

    let fromBrand = '';
    let toBrand = '';

    const customerLower = customerName.toLowerCase();
    if (customerLower.includes('bright ivy') || customerLower.includes('brightivy')) {
      // Customer is BI, so DC is selling to BI
      fromBrand = dcBrand?.id || '';
      toBrand = biBrand?.id || '';
    } else if (customerLower.includes('display champ') || customerLower.includes('displaychamp')) {
      // Customer is DC, so BI is selling to DC
      fromBrand = biBrand?.id || '';
      toBrand = dcBrand?.id || '';
    }

    setConvertDialog({ source, sourceId, date, amount, customerName });
    setConvertForm({
      from_brand_id: fromBrand,
      to_brand_id: toBrand,
      category: 'manufacturing',
      description: '',
      exclude_original: source === 'orders', // Only for orders table
    });
  };

  const totalCandidates = (candidates?.summary.ordersCount || 0) + (candidates?.summary.revenueCount || 0);

  return (
    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-amber-900 dark:text-amber-100">
              B2B → IC Migration Helper
            </CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-200">
              Find B2B orders that might be inter-company transactions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={fetchCandidates}
            disabled={isLoading}
            className="border-amber-300"
          >
            {isLoading ? 'Scanning...' : isExpanded ? 'Refresh' : 'Scan B2B Orders'}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && candidates && (
        <CardContent>
          {totalCandidates === 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No B2B orders found that look like inter-company transactions.
              Customer names containing &quot;Bright Ivy&quot;, &quot;Display Champ&quot;, or &quot;Valhalla&quot; would be flagged here.
            </p>
          ) : (
            <>
              <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/40 rounded">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Found <strong>{totalCandidates}</strong> potential IC transactions
                  ({formatCurrency(candidates.summary.ordersTotal + candidates.summary.revenueTotal)} total)
                </p>
              </div>

              {candidates.candidateOrders.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-2 text-amber-900 dark:text-amber-100">
                    From Orders Table ({candidates.candidateOrders.length})
                  </h4>
                  <div className="space-y-2">
                    {candidates.candidateOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                      >
                        <div className="text-sm">
                          <span className="font-medium">
                            {format(new Date(order.order_date), 'MMM d, yyyy')}
                          </span>
                          {' - '}
                          <span>{order.b2b_customer_name || order.customer_name}</span>
                          {' - '}
                          <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                          <Badge variant="outline" className="ml-2">{order.brand?.code}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConvertDialog(
                            'orders',
                            order.id,
                            order.order_date,
                            order.subtotal,
                            order.b2b_customer_name || order.customer_name,
                            order.brand_id
                          )}
                          disabled={convertingId === order.id}
                        >
                          {convertingId === order.id ? 'Converting...' : 'Convert to IC'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidates.candidateRevenue.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-amber-900 dark:text-amber-100">
                    From B2B Revenue Table ({candidates.candidateRevenue.length})
                  </h4>
                  <div className="space-y-2">
                    {candidates.candidateRevenue.map((revenue) => (
                      <div
                        key={revenue.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                      >
                        <div className="text-sm">
                          <span className="font-medium">
                            {format(new Date(revenue.date), 'MMM d, yyyy')}
                          </span>
                          {' - '}
                          <span>{revenue.customer_name}</span>
                          {' - '}
                          <span className="font-medium">{formatCurrency(revenue.subtotal)}</span>
                          <Badge variant="outline" className="ml-2">{revenue.brand?.code}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConvertDialog(
                            'b2b_revenue',
                            revenue.id,
                            revenue.date,
                            revenue.subtotal,
                            revenue.customer_name,
                            revenue.brand_id
                          )}
                          disabled={convertingId === revenue.id}
                        >
                          {convertingId === revenue.id ? 'Converting...' : 'Convert to IC'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}

      {/* Convert Dialog */}
      <Dialog open={!!convertDialog} onOpenChange={(open) => !open && setConvertDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to IC Transaction</DialogTitle>
            <DialogDescription>
              Converting {convertDialog?.source === 'orders' ? 'order' : 'B2B revenue'} from{' '}
              {convertDialog && format(new Date(convertDialog.date), 'MMM d, yyyy')} for{' '}
              {convertDialog && formatCurrency(convertDialog.amount)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2 space-y-2">
                <Label>From (Provider)</Label>
                <Select
                  value={convertForm.from_brand_id}
                  onValueChange={(v) => setConvertForm({ ...convertForm, from_brand_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name} ({brand.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-center pb-2">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>To (Receiver)</Label>
                <Select
                  value={convertForm.to_brand_id}
                  onValueChange={(v) => setConvertForm({ ...convertForm, to_brand_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name} ({brand.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={convertForm.category}
                onValueChange={(v) => setConvertForm({ ...convertForm, category: v as InterCompanyCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {IC_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder={`Migrated: ${convertDialog?.customerName}`}
                value={convertForm.description}
                onChange={(e) => setConvertForm({ ...convertForm, description: e.target.value })}
              />
            </div>

            {convertDialog?.source === 'orders' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exclude_original"
                  checked={convertForm.exclude_original}
                  onChange={(e) => setConvertForm({ ...convertForm, exclude_original: e.target.checked })}
                />
                <Label htmlFor="exclude_original" className="text-sm">
                  Exclude original order from P&L (recommended to avoid double-counting)
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={!!convertingId}>
              {convertingId ? 'Converting...' : 'Convert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
