'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Building2,
  Package,
  FileText,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { Supplier } from '@/types';

const PAYMENT_TERMS_OPTIONS = [
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'net_7', label: 'Net 7' },
  { value: 'net_14', label: 'Net 14' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'cod', label: 'Cash on Delivery' },
];

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: '£ GBP' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
];

const initialFormData = {
  name: '',
  code: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  country: '',
  default_lead_time_days: '14',  // Store as string for proper input handling
  min_order_qty: '1',             // Store as string for proper input handling
  min_order_value: '',            // Store as string for proper input handling
  payment_terms: '',
  currency: 'GBP',
  is_active: true,
  notes: '',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0, withComponents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [mounted, setMounted] = useState(false);

  // Form state - using local type to allow string values for number inputs
  const [formData, setFormData] = useState(initialFormData);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', filterStatus);

      const response = await fetch(`/api/inventory/suppliers?${params}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setSuppliers(data.suppliers || []);
      setSummary(data.summary || { total: 0, active: 0, inactive: 0, withComponents: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load suppliers');
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
  }, [filterStatus]);

  // Filtered suppliers (client-side search)
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code?.toLowerCase().includes(query) ||
        s.contact_name?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a supplier name');
      return;
    }

    try {
      const url = editingId
        ? `/api/inventory/suppliers/${editingId}`
        : '/api/inventory/suppliers';
      const method = editingId ? 'PATCH' : 'POST';

      // Convert string values to numbers for API
      const payload = {
        ...formData,
        default_lead_time_days: parseInt(formData.default_lead_time_days) || 14,
        min_order_qty: parseInt(formData.min_order_qty) || 1,
        min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(editingId ? 'Supplier updated' : 'Supplier created');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      code: supplier.code || '',
      contact_name: supplier.contact_name || '',
      contact_email: supplier.contact_email || '',
      contact_phone: supplier.contact_phone || '',
      address: supplier.address || '',
      country: supplier.country || '',
      default_lead_time_days: String(supplier.default_lead_time_days),
      min_order_qty: String(supplier.min_order_qty),
      min_order_value: supplier.min_order_value ? String(supplier.min_order_value) : '',
      payment_terms: supplier.payment_terms || '',
      currency: supplier.currency,
      is_active: supplier.is_active,
      notes: supplier.notes || '',
    });
    setEditingId(supplier.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      const response = await fetch(`/api/inventory/suppliers/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.softDelete) {
        toast.success('Supplier marked as inactive');
      } else {
        toast.success('Supplier deleted');
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Suppliers</h2>
          <p className="text-muted-foreground">
            Manage suppliers and their terms for components
          </p>
        </div>
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
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Supplier</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Update supplier details' : 'Add a new supplier to your inventory system'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Supplier Name *</Label>
                      <Input
                        placeholder="e.g., Acme Manufacturing"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Code</Label>
                      <Input
                        placeholder="e.g., ACME"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        placeholder="Primary contact"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="supplier@example.com"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+44 123 456 7890"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        placeholder="United Kingdom"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea
                      placeholder="Full address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Terms */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Default Terms</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Lead Time (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.default_lead_time_days}
                        onChange={(e) => setFormData({ ...formData, default_lead_time_days: e.target.value })}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                            setFormData({ ...formData, default_lead_time_days: '14' });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Order Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.min_order_qty}
                        onChange={(e) => setFormData({ ...formData, min_order_qty: e.target.value })}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                            setFormData({ ...formData, min_order_qty: '1' });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Order Value</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        value={formData.min_order_value}
                        onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(v) => setFormData({ ...formData, currency: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Payment Terms</Label>
                      <Select
                        value={formData.payment_terms || 'none'}
                        onValueChange={(v) => setFormData({ ...formData, payment_terms: v === 'none' ? '' : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {PAYMENT_TERMS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notes & Status */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Internal notes about this supplier..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <Label>Active Status</Label>
                      <p className="text-xs text-muted-foreground">Inactive suppliers won't appear in dropdowns</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingId ? 'Update' : 'Add'} Supplier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">In database</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'active' ? 'ring-2 ring-green-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for ordering</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filterStatus === 'inactive' ? 'ring-2 ring-gray-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterStatus(filterStatus === 'inactive' ? 'all' : 'inactive')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-4 w-4 text-gray-500" />
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{summary.inactive}</div>
            <p className="text-xs text-muted-foreground mt-1">Not in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Package className="h-4 w-4 text-blue-600" />
              With Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.withComponents}</div>
            <p className="text-xs text-muted-foreground mt-1">Linked to components</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, code, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {mounted && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Lead Time</TableHead>
                <TableHead className="text-center">Components</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No suppliers match your search'
                      : 'No suppliers yet. Click "Add Supplier" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className={!supplier.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.code && (
                            <div className="text-xs text-muted-foreground font-mono">{supplier.code}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {supplier.contact_name && (
                          <div className="font-medium">{supplier.contact_name}</div>
                        )}
                        {supplier.contact_email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {supplier.contact_email}
                          </div>
                        )}
                        {supplier.contact_phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {supplier.contact_phone}
                          </div>
                        )}
                        {!supplier.contact_name && !supplier.contact_email && !supplier.contact_phone && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {supplier.default_lead_time_days}d
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.componentCount && supplier.componentCount > 0 ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {supplier.componentCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.payment_terms ? (
                        <Badge variant="outline">
                          {PAYMENT_TERMS_OPTIONS.find(o => o.value === supplier.payment_terms)?.label || supplier.payment_terms}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier.id)}
                          title="Delete"
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

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Suppliers
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Suppliers provide the components used in your products. Link components to suppliers
            in the Components page to track pricing, lead times, and preferred vendors.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Lead Time</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Days from order to delivery
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Min Order Qty</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Minimum units per order
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Min Order Value</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Minimum order total
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
