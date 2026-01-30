'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle,
  Package,
  XCircle,
  Truck,
  AlertCircle,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PurchaseOrderStatus, Supplier } from '@/types';

interface PurchaseOrderWithRelations {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  supplier: { id: string; name: string; code: string | null } | null;
  brand: { id: string; name: string; code: string } | null;
  total: number;
  currency: string;
  ordered_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  created_at: string;
  items: Array<{
    id: string;
    quantity_ordered: number;
    quantity_received: number;
    is_complete: boolean;
    component: { id: string; sku: string; name: string } | null;
  }>;
}

interface Summary {
  total: number;
  draft: number;
  pending: number;
  sent: number;
  partial: number;
  received: number;
  cancelled: number;
  totalValue: number;
  openValue: number;
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileText },
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircle },
  sent: { label: 'Sent', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: Truck },
  confirmed: { label: 'Confirmed', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: CheckCircle },
  partial: { label: 'Partial', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: AlertCircle },
  received: { label: 'Received', color: 'text-green-700', bgColor: 'bg-green-100', icon: Package },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
};

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithRelations[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    draft: 0,
    pending: 0,
    sent: 0,
    partial: 0,
    received: 0,
    cancelled: 0,
    totalValue: 0,
    openValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterSupplier !== 'all') params.set('supplier', filterSupplier);

      const response = await fetch(`/api/inventory/po?${params}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setPurchaseOrders(data.purchaseOrders || []);
      setSummary(data.summary || {
        total: 0,
        draft: 0,
        pending: 0,
        sent: 0,
        partial: 0,
        received: 0,
        cancelled: 0,
        totalValue: 0,
        openValue: 0,
      });
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [filterStatus, filterSupplier]);

  // Client-side search filtering
  const filteredPOs = purchaseOrders.filter((po) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(query) ||
      po.supplier?.name.toLowerCase().includes(query) ||
      po.supplier?.code?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
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

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getItemsSummary = (items: PurchaseOrderWithRelations['items']) => {
    const total = items.length;
    const complete = items.filter(i => i.is_complete).length;
    if (complete === total) {
      return <span className="text-green-600">{total} items (all received)</span>;
    }
    if (complete > 0) {
      return <span className="text-orange-600">{complete}/{total} received</span>;
    }
    return <span className="text-muted-foreground">{total} items</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Purchase Orders</h2>
          <p className="text-muted-foreground">
            Manage orders to suppliers and track receiving
          </p>
        </div>
        <Link href="/inventory/po/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total POs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(summary.totalValue)} total
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'draft' ? 'ring-2 ring-gray-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'draft' ? 'all' : 'draft')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-4 w-4 text-gray-600" />
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summary.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">Not yet sent</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'sent' ? 'ring-2 ring-indigo-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'sent' ? 'all' : 'sent')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Truck className="h-4 w-4 text-indigo-600" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{summary.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'partial' ? 'ring-2 ring-orange-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'partial' ? 'all' : 'partial')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Partial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.partial}</div>
            <p className="text-xs text-muted-foreground mt-1">Partially received</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'received' ? 'ring-2 ring-green-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'received' ? 'all' : 'received')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.received}</div>
            <p className="text-xs text-muted-foreground mt-1">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Open Value Card */}
      {summary.openValue > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Open Orders Value
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Total value of orders not yet received
                </p>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(summary.openValue)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search PO number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {mounted && (
          <>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No purchase orders match your search'
                      : 'No purchase orders yet. Click "Create PO" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow
                    key={po.id}
                    className={`cursor-pointer hover:bg-muted/50 ${po.status === 'cancelled' ? 'opacity-50' : ''}`}
                  >
                    <TableCell>
                      <Link href={`/inventory/po/${po.id}`} className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{po.po_number}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {po.supplier ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{po.supplier.name}</div>
                            {po.supplier.code && (
                              <div className="text-xs text-muted-foreground">{po.supplier.code}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{getItemsSummary(po.items)}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(po.total, po.currency)}
                    </TableCell>
                    <TableCell>
                      {po.expected_date ? (
                        <div className="text-sm">
                          {formatDate(po.expected_date)}
                          {new Date(po.expected_date) < new Date() && po.status !== 'received' && (
                            <Badge className="ml-2 bg-red-100 text-red-700" variant="outline">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/inventory/po/${po.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Purchase Order Workflow
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Purchase orders track component orders to suppliers. When items are received,
            stock levels are automatically updated.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-blue-700 dark:text-blue-300">
            <span>Draft → Sent → Confirmed → Partial/Received</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
