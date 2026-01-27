'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2 } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/pnl/targets';
import type { B2BRevenue, Brand, PaymentMethod } from '@/types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'other', label: 'Other' },
];

export default function B2BRevenuePage() {
  const [revenues, setRevenues] = useState<B2BRevenue[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    brand_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    customer_name: '',
    invoice_number: '',
    subtotal: '',
    shipping_charged: '',
    tax: '',
    total: '',
    payment_method: '' as PaymentMethod | '',
    notes: '',
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: revenueData }, { data: brandsData }] = await Promise.all([
        supabase
          .from('b2b_revenue')
          .select('*')
          .order('date', { ascending: false })
          .limit(100),
        supabase.from('brands').select('*'),
      ]);

      setRevenues(revenueData || []);
      setBrands(brandsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load B2B revenue data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-calculate total when subtotal, shipping, or tax changes
  useEffect(() => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const shipping = parseFloat(formData.shipping_charged) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const total = subtotal + shipping + tax;
    setFormData((prev) => ({ ...prev, total: total.toFixed(2) }));
  }, [formData.subtotal, formData.shipping_charged, formData.tax]);

  const resetForm = () => {
    setFormData({
      brand_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      customer_name: '',
      invoice_number: '',
      subtotal: '',
      shipping_charged: '',
      tax: '',
      total: '',
      payment_method: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.brand_id || !formData.customer_name || !formData.subtotal) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const payload = {
        brand_id: formData.brand_id,
        date: formData.date,
        customer_name: formData.customer_name,
        invoice_number: formData.invoice_number || null,
        subtotal: parseFloat(formData.subtotal) || 0,
        shipping_charged: parseFloat(formData.shipping_charged) || 0,
        tax: parseFloat(formData.tax) || 0,
        total: parseFloat(formData.total) || 0,
        payment_method: formData.payment_method || null,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('b2b_revenue')
          .update(payload as never)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('B2B revenue updated');
      } else {
        const { error } = await supabase.from('b2b_revenue').insert(payload as never);

        if (error) throw error;
        toast.success('B2B revenue added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving B2B revenue:', error);
      toast.error('Failed to save B2B revenue');
    }
  };

  const handleEdit = (revenue: B2BRevenue) => {
    setFormData({
      brand_id: revenue.brand_id,
      date: revenue.date,
      customer_name: revenue.customer_name,
      invoice_number: revenue.invoice_number || '',
      subtotal: revenue.subtotal.toString(),
      shipping_charged: revenue.shipping_charged.toString(),
      tax: revenue.tax.toString(),
      total: revenue.total.toString(),
      payment_method: revenue.payment_method || '',
      notes: revenue.notes || '',
    });
    setEditingId(revenue.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase.from('b2b_revenue').delete().eq('id', id);

      if (error) throw error;
      toast.success('B2B revenue deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting B2B revenue:', error);
      toast.error('Failed to delete B2B revenue');
    }
  };

  const getBrandName = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.name || 'Unknown';
  };

  const getPaymentMethodLabel = (method: PaymentMethod | null) => {
    if (!method) return '-';
    return PAYMENT_METHODS.find((p) => p.value === method)?.label || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">B2B Revenue</h2>
          <p className="text-muted-foreground">
            Track B2B sales and direct payments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add B2B Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} B2B Revenue</DialogTitle>
              <DialogDescription>
                Enter the B2B sale details
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand *</Label>
                  <Select
                    value={formData.brand_id}
                    onValueChange={(v) => setFormData({ ...formData, brand_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    placeholder="e.g., Golf Club Ltd"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input
                    placeholder="e.g., INV-001"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Subtotal (£) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.shipping_charged}
                    onChange={(e) => setFormData({ ...formData, shipping_charged: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(v) => setFormData({ ...formData, payment_method: v as PaymentMethod })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes..."
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
                {editingId ? 'Update' : 'Add'} Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Shipping</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : revenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No B2B revenue data yet. Click "Add B2B Sale" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                revenues.map((revenue) => (
                  <TableRow key={revenue.id}>
                    <TableCell>{format(new Date(revenue.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{getBrandName(revenue.brand_id)}</TableCell>
                    <TableCell className="font-medium">{revenue.customer_name}</TableCell>
                    <TableCell>{revenue.invoice_number || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(revenue.subtotal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(revenue.shipping_charged)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(revenue.total)}</TableCell>
                    <TableCell>{getPaymentMethodLabel(revenue.payment_method)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(revenue)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(revenue.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
