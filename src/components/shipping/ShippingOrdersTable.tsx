'use client';

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, CheckCircle2, Circle, Edit2, Lock, Unlock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getCountryCode, getCountryName } from '@/lib/shipping';
import type { ShippingOrderWithShipment, CarrierType } from '@/lib/shipping';

interface ShippingOrdersTableProps {
  orders: ShippingOrderWithShipment[];
  onShipmentUpdate?: () => void;
}

type SortField = 'order_date' | 'order_number' | 'customer_name' | 'country' | 'platform' | 'shipping_charged' | 'shipping_cost' | 'margin' | 'carrier';
type SortDirection = 'asc' | 'desc';

const CARRIER_LABELS: Record<string, string> = {
  all: 'All Carriers',
  royalmail: 'Royal Mail',
  dhl: 'DHL Express',
  deutschepost: 'Deutsche Post',
};

export function ShippingOrdersTable({ orders, onShipmentUpdate }: ShippingOrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('order_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Edit dialog state
  const [editingOrder, setEditingOrder] = useState<ShippingOrderWithShipment | null>(null);
  const [editCost, setEditCost] = useState<string>('');
  const [editLocked, setEditLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get unique carriers from orders
  const availableCarriers = useMemo(() => {
    const carriers = new Set<string>();
    orders.forEach((order) => {
      if (order.shipment?.carrier) {
        carriers.add(order.shipment.carrier);
      }
    });
    return Array.from(carriers).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply carrier filter
    if (carrierFilter !== 'all') {
      filtered = filtered.filter((order) => order.shipment?.carrier === carrierFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((order) => {
        const orderNumber = order.order_number?.toLowerCase() || '';
        const customerName = order.customer_name?.toLowerCase() || '';
        const trackingNumber = order.shipment?.tracking_number?.toLowerCase() || '';
        const country = getCountryName(getCountryCode(order)).toLowerCase();
        return (
          orderNumber.includes(term) ||
          customerName.includes(term) ||
          trackingNumber.includes(term) ||
          country.includes(term)
        );
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'order_date':
          aVal = new Date(a.order_date).getTime();
          bVal = new Date(b.order_date).getTime();
          break;
        case 'order_number':
          aVal = a.order_number || a.platform_order_id || '';
          bVal = b.order_number || b.platform_order_id || '';
          break;
        case 'customer_name':
          aVal = a.customer_name || '';
          bVal = b.customer_name || '';
          break;
        case 'country':
          aVal = getCountryName(getCountryCode(a));
          bVal = getCountryName(getCountryCode(b));
          break;
        case 'platform':
          aVal = a.platform;
          bVal = b.platform;
          break;
        case 'carrier':
          aVal = a.shipment?.carrier || '';
          bVal = b.shipment?.carrier || '';
          break;
        case 'shipping_charged':
          aVal = a.shipping_charged || 0;
          bVal = b.shipping_charged || 0;
          break;
        case 'shipping_cost':
          aVal = a.totalShippingCost || 0;
          bVal = b.totalShippingCost || 0;
          break;
        case 'margin':
          aVal = (a.shipping_charged || 0) - (a.totalShippingCost || 0);
          bVal = (b.shipping_charged || 0) - (b.totalShippingCost || 0);
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered.slice(0, 100); // Limit to 100 for performance
  }, [orders, searchTerm, carrierFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const openEditDialog = (order: ShippingOrderWithShipment) => {
    setEditingOrder(order);
    setEditCost((order.shipment?.shipping_cost || 0).toFixed(2));
    setEditLocked(order.shipment?.cost_locked || false);
  };

  const closeEditDialog = () => {
    setEditingOrder(null);
    setEditCost('');
    setEditLocked(false);
  };

  const handleSaveCost = async () => {
    if (!editingOrder?.shipment?.id) {
      toast.error('No shipment found for this order');
      return;
    }

    const costValue = parseFloat(editCost);
    if (isNaN(costValue) || costValue < 0) {
      toast.error('Please enter a valid cost');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/shipping/shipments/${editingOrder.shipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_cost: costValue,
          cost_locked: editLocked,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Shipping cost updated');
      closeEditDialog();
      onShipmentUpdate?.();
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error('Failed to update shipping cost');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Carrier Filter */}
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {availableCarriers.map((carrier) => (
                    <SelectItem key={carrier} value={carrier}>
                      {CARRIER_LABELS[carrier] || carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('order_date')}
                  >
                    <div className="flex items-center">
                      Date {getSortIcon('order_date')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('order_number')}
                  >
                    <div className="flex items-center">
                      Order # {getSortIcon('order_number')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('customer_name')}
                  >
                    <div className="flex items-center">
                      Customer {getSortIcon('customer_name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center">
                      Country {getSortIcon('country')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('platform')}
                  >
                    <div className="flex items-center">
                      Platform {getSortIcon('platform')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('carrier')}
                  >
                    <div className="flex items-center">
                      Carrier {getSortIcon('carrier')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('shipping_charged')}
                  >
                    <div className="flex items-center justify-end">
                      Charged {getSortIcon('shipping_charged')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('shipping_cost')}
                  >
                    <div className="flex items-center justify-end">
                      Actual Cost {getSortIcon('shipping_cost')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('margin')}
                  >
                    <div className="flex items-center justify-end">
                      Margin {getSortIcon('margin')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const shippingCharged = order.shipping_charged || 0;
                    const shippingCost = order.totalShippingCost || 0;
                    const margin = shippingCharged - shippingCost;
                    // Check if any shipment has actual cost
                    const hasActualCost = order.shipments?.some(s => s.cost_confidence === 'actual') || false;
                    // Check if any shipment is locked
                    const isLocked = order.shipments?.some(s => s.cost_locked) || false;
                    const countryCode = getCountryCode(order);
                    // Show primary carrier (or multiple if more than one)
                    const shipmentCount = order.shipments?.length || 0;
                    const carrier = order.shipment?.carrier;

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(order.order_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.order_number || order.platform_order_id.slice(-8)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.customer_name || '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getCountryName(countryCode)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.platform}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {carrier ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {CARRIER_LABELS[carrier] || carrier}
                              </Badge>
                              {shipmentCount > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  +{shipmentCount - 1}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(shippingCharged)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isLocked ? (
                              <Lock className="h-3 w-3 text-blue-600" />
                            ) : hasActualCost ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : shipmentCount > 0 ? (
                              <Circle className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Circle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span>{formatCurrency(shippingCost)}</span>
                            {shipmentCount > 1 && (
                              <span className="text-xs text-muted-foreground" title={`Sum of ${shipmentCount} shipments`}>
                                ({shipmentCount})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(margin)}
                        </TableCell>
                        <TableCell>
                          {order.shipment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(order)}
                              title="Edit cost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {orders.length > 100 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing 100 of {orders.length} orders
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Cost Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shipping Cost</DialogTitle>
            <DialogDescription>
              Order #{editingOrder?.order_number || editingOrder?.platform_order_id.slice(-8)}
              {editingOrder?.shipment?.tracking_number && (
                <span className="block text-xs mt-1">
                  Tracking: {editingOrder.shipment.tracking_number}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Shipping Cost (GBP)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editCost}
                onChange={(e) => setEditCost(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {editLocked ? (
                    <Lock className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  )}
                  Lock Cost
                </Label>
                <p className="text-xs text-muted-foreground">
                  {editLocked
                    ? 'Future invoice uploads will not overwrite this cost'
                    : 'Invoice uploads may update this cost automatically'}
                </p>
              </div>
              <Switch
                checked={editLocked}
                onCheckedChange={setEditLocked}
              />
            </div>

            {editingOrder?.shipment && (
              <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                <p>Current confidence: <span className="font-medium">{editingOrder.shipment.cost_confidence || 'none'}</span></p>
                {editingOrder.shipment.match_method && (
                  <p>Match method: <span className="font-medium">{editingOrder.shipment.match_method}</span></p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveCost} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Cost'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
