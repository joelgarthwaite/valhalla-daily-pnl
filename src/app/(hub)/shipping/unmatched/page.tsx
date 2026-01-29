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
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  RefreshCw,
  FileQuestion,
  Trash2,
  Copy,
} from 'lucide-react';
import type { UnmatchedInvoiceRecord, UnmatchedRecordStatus } from '@/types';

interface StatusCounts {
  pending: number;
  matched: number;
  voided: number;
  resolved: number;
  total: number;
}

const statusConfig: Record<UnmatchedRecordStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  matched: {
    label: 'Matched',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <LinkIcon className="h-3 w-3" />,
  },
  voided: {
    label: 'Voided',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

export default function UnmatchedInvoicesPage() {
  const [records, setRecords] = useState<UnmatchedInvoiceRecord[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    matched: 0,
    voided: 0,
    resolved: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [mounted, setMounted] = useState(false);

  // Dialog states
  const [selectedRecord, setSelectedRecord] = useState<UnmatchedInvoiceRecord | null>(null);
  const [actionType, setActionType] = useState<'void' | 'resolve' | 'match' | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [orderId, setOrderId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Order search states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSearchResults, setOrderSearchResults] = useState<Array<{
    id: string;
    order_number: string | null;
    order_date: string;
    customer_name: string | null;
    b2b_customer_name: string | null;
    subtotal: number;
    platform: string;
  }>>([]);
  const [orderSearchLoading, setOrderSearchLoading] = useState(false);
  const [selectedOrderDisplay, setSelectedOrderDisplay] = useState<string | null>(null);

  // Dedupe state
  const [dedupeLoading, setDedupeLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDedupe = async () => {
    if (!confirm('This will remove duplicate records (same tracking number, invoice, and cost). Continue?')) {
      return;
    }

    setDedupeLoading(true);
    try {
      const response = await fetch('/api/invoices/unmatched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dedupe' }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchRecords();
      } else {
        alert(data.error || 'Failed to deduplicate');
      }
    } catch (error) {
      console.error('Error deduplicating:', error);
      alert('Failed to deduplicate records');
    } finally {
      setDedupeLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/invoices/unmatched?${params}`);
      const data = await response.json();

      if (data.records) {
        setRecords(data.records);
        setStatusCounts(data.statusCounts);
      }
    } catch (error) {
      console.error('Error fetching unmatched records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchRecords();
    }
  }, [statusFilter, mounted]);

  const handleAction = async () => {
    if (!selectedRecord || !actionType) return;

    setActionLoading(true);
    try {
      let status: UnmatchedRecordStatus;
      const body: Record<string, unknown> = {
        id: selectedRecord.id,
        resolution_notes: resolutionNotes || null,
      };

      switch (actionType) {
        case 'void':
          status = 'voided';
          break;
        case 'resolve':
          status = 'resolved';
          break;
        case 'match':
          status = 'matched';
          body.matched_order_id = orderId;
          break;
        default:
          return;
      }

      body.status = status;

      const response = await fetch('/api/invoices/unmatched', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        closeDialog();
        fetchRecords();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Failed to update record');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (record: UnmatchedInvoiceRecord) => {
    if (!confirm(`Delete unmatched record for tracking ${record.tracking_number}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/unmatched?id=${record.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRecords();
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const closeDialog = () => {
    setSelectedRecord(null);
    setActionType(null);
    setResolutionNotes('');
    setOrderId('');
    setOrderSearch('');
    setOrderSearchResults([]);
    setSelectedOrderDisplay(null);
  };

  // Debounced order search
  useEffect(() => {
    if (!orderSearch || orderSearch.length < 2) {
      setOrderSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setOrderSearchLoading(true);
      try {
        const params = new URLSearchParams({ search: orderSearch, limit: '10' });
        const response = await fetch(`/api/orders?${params}`);
        const data = await response.json();
        if (data.orders) {
          setOrderSearchResults(data.orders);
        }
      } catch (error) {
        console.error('Error searching orders:', error);
      } finally {
        setOrderSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [orderSearch]);

  const selectOrder = (order: typeof orderSearchResults[0]) => {
    setOrderId(order.id);
    setSelectedOrderDisplay(
      `${order.order_number || order.id.slice(0, 8)} - ${order.b2b_customer_name || order.customer_name || 'Unknown'} (£${order.subtotal.toFixed(2)})`
    );
    setOrderSearch('');
    setOrderSearchResults([]);
  };

  const openActionDialog = (record: UnmatchedInvoiceRecord, action: 'void' | 'resolve' | 'match') => {
    setSelectedRecord(record);
    setActionType(action);
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
    return `£${amount.toFixed(2)}`;
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Unmatched Invoices</h1>
        <p className="text-muted-foreground">
          Review and reconcile invoice records that couldn&apos;t be matched to orders
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'voided' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter('voided')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{statusCounts.voided}</p>
                <p className="text-sm text-muted-foreground">Voided</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'matched' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter('matched')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{statusCounts.matched}</p>
                <p className="text-sm text-muted-foreground">Matched</p>
              </div>
              <LinkIcon className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'resolved' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('resolved')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <FileQuestion className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Unmatched Records</CardTitle>
              <CardDescription>
                Invoice line items that couldn&apos;t be matched to any order
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDedupe} disabled={dedupeLoading || loading}>
                <Copy className={`h-4 w-4 mr-2 ${dedupeLoading ? 'animate-pulse' : ''}`} />
                Dedupe
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchRecords()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No unmatched records found</p>
              <p className="text-sm">
                {statusFilter === 'pending'
                  ? 'All invoice records have been matched or resolved!'
                  : 'Try changing the filter to see more records.'}
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking Number</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Ship Date</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">
                        {record.tracking_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.carrier === 'dhl' ? 'default' : 'secondary'}>
                          {record.carrier === 'dhl' ? 'DHL' : 'Royal Mail'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(record.shipping_date)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(record.shipping_cost)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.invoice_number || record.file_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusConfig[record.status].color} flex items-center gap-1 w-fit`}
                        >
                          {statusConfig[record.status].icon}
                          {statusConfig[record.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                        {record.resolution_notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(record, 'match')}
                              title="Link to Order"
                            >
                              <LinkIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(record, 'void')}
                              title="Mark as Voided"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(record, 'resolve')}
                              title="Mark as Resolved"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
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

      {/* Action Dialog */}
      <Dialog open={!!selectedRecord && !!actionType} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'void' && 'Mark as Voided'}
              {actionType === 'resolve' && 'Mark as Resolved'}
              {actionType === 'match' && 'Link to Order'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'void' && 'This will mark the record as a wasted/unused label.'}
              {actionType === 'resolve' && 'Mark this record as resolved with notes.'}
              {actionType === 'match' && 'Create a shipment linked to an existing order.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedRecord && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Tracking:</span>{' '}
                  <span className="font-mono">{selectedRecord.tracking_number}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Cost:</span>{' '}
                  <span className="font-mono">{formatCurrency(selectedRecord.shipping_cost)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  {formatDate(selectedRecord.shipping_date)}
                </p>
              </div>
            )}

            {actionType === 'match' && (
              <div className="space-y-2">
                <Label htmlFor="orderSearch">Search Orders</Label>
                {selectedOrderDisplay ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                      <span className="text-green-700 font-medium">Selected:</span>{' '}
                      {selectedOrderDisplay}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOrderId('');
                        setSelectedOrderDisplay(null);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="orderSearch"
                      placeholder="Search by customer name or order number..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {orderSearchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {orderSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {orderSearchResults.map((order) => (
                          <button
                            key={order.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                            onClick={() => selectOrder(order)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {order.order_number || order.id.slice(0, 8)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                £{order.subtotal.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>{order.b2b_customer_name || order.customer_name || 'Unknown'}</span>
                              <span>•</span>
                              <span className="capitalize">{order.platform}</span>
                              <span>•</span>
                              <span>{new Date(order.order_date).toLocaleDateString('en-GB')}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {orderSearch.length >= 2 && !orderSearchLoading && orderSearchResults.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
                        No orders found matching &quot;{orderSearch}&quot;
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Type at least 2 characters to search by customer name or order number
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                {actionType === 'void' ? 'Reason for Voiding' : 'Notes'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  actionType === 'void'
                    ? 'e.g., Label created but never shipped, customer cancelled'
                    : 'Add any relevant notes...'
                }
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading || (actionType === 'match' && !orderId)}
              variant={actionType === 'void' ? 'destructive' : 'default'}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
