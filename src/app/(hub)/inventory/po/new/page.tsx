'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Building2,
  Package,
  Save,
  Send,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Supplier, Component } from '@/types';

interface POItem {
  component_id: string;
  component: Component;
  quantity: number;
  unit_price: number;
  notes: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<number | ''>(0);
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<POItem[]>([]);

  // Add item dialog state
  const [componentSearch, setComponentSearch] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number | ''>(1);
  const [itemPrice, setItemPrice] = useState<number | ''>(0);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch suppliers
      const suppliersRes = await fetch('/api/inventory/suppliers?status=active');
      const suppliersData = await suppliersRes.json();

      // Fetch components
      const componentsRes = await fetch('/api/inventory/components');
      const componentsData = await componentsRes.json();

      if (suppliersData.error) throw new Error(suppliersData.error);
      if (componentsData.error) throw new Error(componentsData.error);

      setSuppliers(suppliersData.suppliers || []);
      setComponents(componentsData.components || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter components for search
  const filteredComponents = components.filter((c) => {
    if (!componentSearch) return true;
    const search = componentSearch.toLowerCase();
    return (
      c.sku.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search)
    );
  }).filter((c) => !items.some((item) => item.component_id === c.id)); // Exclude already added

  const handleAddItem = () => {
    if (!selectedComponent) {
      toast.error('Please select a component');
      return;
    }
    const qty = typeof itemQuantity === 'number' ? itemQuantity : 1;
    const price = typeof itemPrice === 'number' ? itemPrice : 0;
    if (qty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    if (price < 0) {
      toast.error('Price cannot be negative');
      return;
    }

    setItems([
      ...items,
      {
        component_id: selectedComponent.id,
        component: selectedComponent,
        quantity: qty,
        unit_price: price,
        notes: '',
      },
    ]);

    // Reset
    setSelectedComponent(null);
    setComponentSearch('');
    setItemQuantity(1);
    setItemPrice(0);
  };

  const handleRemoveItem = (componentId: string) => {
    setItems(items.filter((item) => item.component_id !== componentId));
  };

  const handleUpdateItem = (componentId: string, field: 'quantity' | 'unit_price', value: number) => {
    setItems(items.map((item) =>
      item.component_id === componentId
        ? { ...item, [field]: value }
        : item
    ));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const shippingCostNum = typeof shippingCost === 'number' ? shippingCost : 0;
  const total = subtotal + shippingCostNum;

  const handleSave = async (sendImmediately: boolean = false) => {
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/inventory/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          status: sendImmediately ? 'sent' : 'draft',
          expected_date: expectedDate || null,
          shipping_cost: shippingCostNum,
          notes: notes || null,
          items: items.map((item) => ({
            component_id: item.component_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Purchase order ${data.poNumber} created`);
      router.push(`/inventory/po/${data.purchaseOrder.id}`);
    } catch (error) {
      console.error('Error creating PO:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Create Purchase Order</h2>
          <p className="text-muted-foreground">
            Order components from a supplier
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Supplier Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mounted && (
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <span>{supplier.name}</span>
                          {supplier.code && (
                            <span className="text-muted-foreground">({supplier.code})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {supplierId && (
                <div className="mt-3 text-sm text-muted-foreground">
                  {(() => {
                    const supplier = suppliers.find((s) => s.id === supplierId);
                    return supplier ? (
                      <div className="flex gap-4">
                        <span>Lead time: {supplier.default_lead_time_days} days</span>
                        <span>Min qty: {supplier.min_order_qty}</span>
                        {supplier.payment_terms && <span>Terms: {supplier.payment_terms}</span>}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items
              </CardTitle>
              <CardDescription>
                Add components to this purchase order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Item Form */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Component</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search components..."
                        value={componentSearch}
                        onChange={(e) => setComponentSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {componentSearch && filteredComponents.length > 0 && (
                      <div className="border rounded-md max-h-[150px] overflow-y-auto">
                        {filteredComponents.slice(0, 10).map((component) => (
                          <div
                            key={component.id}
                            className={`p-2 cursor-pointer hover:bg-muted ${selectedComponent?.id === component.id ? 'bg-primary/10' : ''}`}
                            onClick={() => {
                              setSelectedComponent(component);
                              setComponentSearch(component.name);
                            }}
                          >
                            <div className="font-mono text-sm">{component.sku}</div>
                            <div className="text-xs text-muted-foreground">{component.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedComponent && (
                      <Badge variant="outline" className="mt-2">
                        Selected: {selectedComponent.name}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                            setItemQuantity(1);
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price (£)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                            setItemPrice(0);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleAddItem} disabled={!selectedComponent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {/* Items Table */}
              {items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.component_id}>
                        <TableCell>
                          <div className="font-mono text-sm">{item.component.sku}</div>
                          <div className="text-xs text-muted-foreground">{item.component.name}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            className="w-20 text-center"
                            defaultValue={item.quantity}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              handleUpdateItem(item.component_id, 'quantity', isNaN(val) || val < 1 ? 1 : val);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 text-right"
                            defaultValue={item.unit_price}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateItem(item.component_id, 'unit_price', isNaN(val) || val < 0 ? 0 : val);
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.component_id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items added yet. Search and add components above.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any notes for this purchase order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Shipping Cost (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  onBlur={(e) => {
                    if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                      setShippingCost(0);
                    }
                  }}
                />
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items ({items.length})</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(shippingCostNum)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  className="w-full"
                  onClick={() => handleSave(false)}
                  disabled={isSaving || !supplierId || items.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSave(true)}
                  disabled={isSaving || !supplierId || items.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Save & Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
