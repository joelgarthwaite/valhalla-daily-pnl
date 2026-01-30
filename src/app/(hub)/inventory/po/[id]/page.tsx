'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  PackageCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface POItem {
  id: string;
  component_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  line_total: number;
  is_complete: boolean;
  notes: string | null;
  component: {
    id: string;
    sku: string;
    name: string;
    category: { name: string } | null;
  };
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  ordered_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier: {
    id: string;
    name: string;
    code: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    default_lead_time_days: number;
    payment_terms: string | null;
  };
  brand: {
    id: string;
    name: string;
    code: string;
  } | null;
  items: POItem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  pending: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  sent: { label: 'Sent to Supplier', color: 'bg-purple-100 text-purple-700', icon: Send },
  confirmed: { label: 'Confirmed', color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle2 },
  partial: { label: 'Partially Received', color: 'bg-orange-100 text-orange-700', icon: Package },
  received: { label: 'Fully Received', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Receiving dialog state
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receivingItems, setReceivingItems] = useState<Record<string, number>>({});

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editExpectedDate, setEditExpectedDate] = useState('');
  const [editShippingCost, setEditShippingCost] = useState<number | ''>(0);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Status change confirmation
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  const fetchPurchaseOrder = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/inventory/po/${id}`);
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        router.push('/inventory/po');
        return;
      }

      setPurchaseOrder(data.purchaseOrder);
    } catch (error) {
      console.error('Error fetching PO:', error);
      toast.error('Failed to load purchase order');
      router.push('/inventory/po');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: purchaseOrder?.currency || 'GBP',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || !purchaseOrder) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/inventory/po/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingStatus }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Status updated to ${statusConfig[pendingStatus]?.label || pendingStatus}`);
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
      setStatusDialogOpen(false);
      setPendingStatus(null);
    }
  };

  const openReceiveDialog = () => {
    if (!purchaseOrder) return;

    // Initialize with 0 for each item that hasn't been fully received
    const initial: Record<string, number> = {};
    purchaseOrder.items.forEach((item) => {
      if (!item.is_complete) {
        initial[item.id] = 0;
      }
    });
    setReceivingItems(initial);
    setReceiveDialogOpen(true);
  };

  const handleReceiveItems = async () => {
    if (!purchaseOrder) return;

    const itemsToReceive = Object.entries(receivingItems)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        itemId,
        quantityReceived: qty,
      }));

    if (itemsToReceive.length === 0) {
      toast.error('Please enter quantities to receive');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/inventory/po/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiveItems: itemsToReceive }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Items received successfully');
      setReceiveDialogOpen(false);
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Error receiving items:', error);
      toast.error('Failed to receive items');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditDialog = () => {
    if (!purchaseOrder) return;
    setEditNotes(purchaseOrder.notes || '');
    setEditExpectedDate(purchaseOrder.expected_date || '');
    setEditShippingCost(purchaseOrder.shipping_cost);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/inventory/po/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: editNotes || null,
          expected_date: editExpectedDate || null,
          shipping_cost: typeof editShippingCost === 'number' ? editShippingCost : 0,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Purchase order updated');
      setEditDialogOpen(false);
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Error updating PO:', error);
      toast.error('Failed to update purchase order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/inventory/po/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Purchase order deleted');
      router.push('/inventory/po');
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error('Failed to delete purchase order');
    } finally {
      setIsUpdating(false);
      setDeleteDialogOpen(false);
    }
  };

  const getAvailableActions = () => {
    if (!purchaseOrder) return [];

    const actions: { label: string; status: string; variant: 'default' | 'outline' | 'destructive' }[] = [];

    switch (purchaseOrder.status) {
      case 'draft':
        actions.push({ label: 'Send to Supplier', status: 'sent', variant: 'default' });
        actions.push({ label: 'Cancel', status: 'cancelled', variant: 'destructive' });
        break;
      case 'pending':
        actions.push({ label: 'Approve', status: 'approved', variant: 'default' });
        actions.push({ label: 'Cancel', status: 'cancelled', variant: 'destructive' });
        break;
      case 'approved':
        actions.push({ label: 'Send to Supplier', status: 'sent', variant: 'default' });
        actions.push({ label: 'Cancel', status: 'cancelled', variant: 'destructive' });
        break;
      case 'sent':
        actions.push({ label: 'Mark Confirmed', status: 'confirmed', variant: 'outline' });
        actions.push({ label: 'Cancel', status: 'cancelled', variant: 'destructive' });
        break;
      case 'confirmed':
        actions.push({ label: 'Cancel', status: 'cancelled', variant: 'destructive' });
        break;
      case 'partial':
        actions.push({ label: 'Cancel Remaining', status: 'cancelled', variant: 'destructive' });
        break;
      case 'cancelled':
        actions.push({ label: 'Re-open as Draft', status: 'draft', variant: 'outline' });
        break;
    }

    return actions;
  };

  const canReceive = purchaseOrder && ['sent', 'confirmed', 'partial'].includes(purchaseOrder.status);
  const canEdit = purchaseOrder && ['draft', 'pending'].includes(purchaseOrder.status);
  const canDelete = purchaseOrder && ['draft', 'cancelled'].includes(purchaseOrder.status);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Purchase order not found</p>
      </div>
    );
  }

  const status = statusConfig[purchaseOrder.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const totalOrdered = purchaseOrder.items.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const totalReceived = purchaseOrder.items.reduce((sum, item) => sum + item.quantity_received, 0);
  const receiveProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{purchaseOrder.po_number}</h2>
              <Badge className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {formatDate(purchaseOrder.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          {canReceive && (
            <Button onClick={openReceiveDialog}>
              <PackageCheck className="h-4 w-4 mr-2" />
              Receive Items
            </Button>
          )}
        </div>
      </div>

      {/* Status Actions */}
      {getAvailableActions().length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Actions:</span>
              {getAvailableActions().map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={() => handleStatusChange(action.status)}
                  disabled={isUpdating}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{purchaseOrder.supplier.name}</span>
                  {purchaseOrder.supplier.code && (
                    <span className="text-muted-foreground">({purchaseOrder.supplier.code})</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  {purchaseOrder.supplier.contact_name && (
                    <div>Contact: {purchaseOrder.supplier.contact_name}</div>
                  )}
                  {purchaseOrder.supplier.contact_email && (
                    <div>Email: {purchaseOrder.supplier.contact_email}</div>
                  )}
                  {purchaseOrder.supplier.contact_phone && (
                    <div>Phone: {purchaseOrder.supplier.contact_phone}</div>
                  )}
                  {purchaseOrder.supplier.payment_terms && (
                    <div>Terms: {purchaseOrder.supplier.payment_terms}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items ({purchaseOrder.items.length})
              </CardTitle>
              {canReceive && (
                <CardDescription>
                  Received {totalReceived} of {totalOrdered} items ({receiveProgress.toFixed(0)}%)
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              {canReceive && (
                <div className="mb-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${receiveProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-center">Ordered</TableHead>
                    <TableHead className="text-center">Received</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{item.component.sku}</div>
                        <div className="text-xs text-muted-foreground">{item.component.name}</div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-center">
                        {item.quantity_received}
                        {item.quantity_received > 0 && !item.is_complete && (
                          <span className="text-muted-foreground">
                            {' '}/ {item.quantity_ordered}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.line_total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.is_complete ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : item.quantity_received > 0 ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Partial
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {purchaseOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{purchaseOrder.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(purchaseOrder.created_at)}</span>
              </div>
              {purchaseOrder.ordered_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ordered</span>
                  <span>{formatDate(purchaseOrder.ordered_date)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected</span>
                <span>{formatDate(purchaseOrder.expected_date)}</span>
              </div>
              {purchaseOrder.received_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Received</span>
                  <span>{formatDate(purchaseOrder.received_date)}</span>
                </div>
              )}
              {!purchaseOrder.received_date && purchaseOrder.expected_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead Time</span>
                  <span>{purchaseOrder.supplier.default_lead_time_days} days</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(purchaseOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(purchaseOrder.shipping_cost)}</span>
              </div>
              {purchaseOrder.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(purchaseOrder.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span>{formatCurrency(purchaseOrder.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {purchaseOrder.shipping_address && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{purchaseOrder.shipping_address}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Receive Items Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receive Items</DialogTitle>
            <DialogDescription>
              Enter the quantity received for each item. This will update stock levels.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-center">Ordered</TableHead>
                  <TableHead className="text-center">Already Received</TableHead>
                  <TableHead className="text-center">Remaining</TableHead>
                  <TableHead className="text-center">Receiving Now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.items
                  .filter((item) => !item.is_complete)
                  .map((item) => {
                    const remaining = item.quantity_ordered - item.quantity_received;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-mono text-sm">{item.component.sku}</div>
                          <div className="text-xs text-muted-foreground">{item.component.name}</div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-center">{item.quantity_received}</TableCell>
                        <TableCell className="text-center font-medium">{remaining}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            className="w-24 text-center mx-auto"
                            value={receivingItems[item.id] || 0}
                            onChange={(e) =>
                              setReceivingItems({
                                ...receivingItems,
                                [item.id]: Math.min(parseInt(e.target.value) || 0, remaining),
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {purchaseOrder.items.every((item) => item.is_complete) && (
            <div className="text-center py-4 text-muted-foreground">
              All items have been fully received.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceiveItems} disabled={isUpdating}>
              {isUpdating ? 'Receiving...' : 'Confirm Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>
              Update purchase order details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={editExpectedDate}
                onChange={(e) => setEditExpectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Shipping Cost ({purchaseOrder.currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editShippingCost}
                onChange={(e) => setEditShippingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                    setEditShippingCost(0);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {purchaseOrder.po_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === 'sent' && (
                <>
                  This will mark the order as sent to the supplier and update stock &quot;on order&quot; quantities.
                </>
              )}
              {pendingStatus === 'cancelled' && (
                <>
                  This will cancel the purchase order. Any unreceived quantities will be removed from &quot;on order&quot; stock.
                </>
              )}
              {pendingStatus === 'confirmed' && (
                <>
                  This will mark the order as confirmed by the supplier.
                </>
              )}
              {pendingStatus === 'approved' && (
                <>
                  This will approve the purchase order for sending.
                </>
              )}
              {pendingStatus === 'draft' && (
                <>
                  This will re-open the purchase order as a draft.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              {isUpdating ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
