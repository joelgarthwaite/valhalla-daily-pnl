'use client';

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, Circle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getCountryCode, getCountryName } from '@/lib/shipping';
import type { ShippingOrderWithShipment } from '@/lib/shipping';

interface ShippingOrdersTableProps {
  orders: ShippingOrderWithShipment[];
}

export function ShippingOrdersTable({ orders }: ShippingOrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'order_date' | 'shipping_charged'>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredOrders = useMemo(() => {
    let filtered = orders;

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

      if (sortField === 'order_date') {
        aVal = new Date(a.order_date).getTime();
        bVal = new Date(b.order_date).getTime();
      } else {
        aVal = a.shipping_charged || 0;
        bVal = b.shipping_charged || 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered.slice(0, 100); // Limit to 100 for performance
  }, [orders, searchTerm, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base">Recent Orders</CardTitle>
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
                  Date {sortField === 'order_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('shipping_charged')}
                >
                  Charged {sortField === 'shipping_charged' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Actual Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const shippingCharged = order.shipping_charged || 0;
                  const shippingCost = order.shipment?.shipping_cost || 0;
                  const margin = shippingCharged - shippingCost;
                  const hasActualCost = order.shipment?.cost_confidence === 'actual';
                  const countryCode = getCountryCode(order);

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
                      <TableCell className="text-right">
                        {formatCurrency(shippingCharged)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasActualCost ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <Circle className="h-3 w-3 text-amber-500" />
                          )}
                          <span>{formatCurrency(shippingCost)}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(margin)}
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
  );
}
