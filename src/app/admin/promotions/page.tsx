'use client';

import { useState, useEffect } from 'react';
import { format, isAfter, isBefore, isWithinInterval } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/pnl/targets';
import type { Promotion, Brand, PromotionType } from '@/types';

const PROMOTION_TYPES: { value: PromotionType; label: string }[] = [
  { value: 'percentage', label: 'Percentage Off' },
  { value: 'fixed_amount', label: 'Fixed Amount Off' },
  { value: 'free_shipping', label: 'Free Shipping' },
  { value: 'bogo', label: 'Buy One Get One' },
];

const PLATFORMS = ['shopify', 'etsy'];

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    brand_id: '',
    name: '',
    code: '',
    type: '' as PromotionType | '',
    value: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    platforms: [] as string[],
    notes: '',
    is_active: true,
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: promotionsData }, { data: brandsData }] = await Promise.all([
        supabase
          .from('promotions')
          .select('*')
          .order('start_date', { ascending: false }),
        supabase.from('brands').select('*'),
      ]);

      setPromotions(promotionsData || []);
      setBrands(brandsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      brand_id: '',
      name: '',
      code: '',
      type: '',
      value: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      platforms: [],
      notes: '',
      is_active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.brand_id || !formData.name || !formData.type) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const payload = {
        brand_id: formData.brand_id,
        name: formData.name,
        code: formData.code || null,
        type: formData.type as PromotionType,
        value: parseFloat(formData.value) || 0,
        start_date: formData.start_date,
        end_date: formData.end_date,
        platforms: formData.platforms,
        notes: formData.notes || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('promotions')
          .update(payload as never)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Promotion updated');
      } else {
        const { error } = await supabase.from('promotions').insert(payload as never);

        if (error) throw error;
        toast.success('Promotion added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast.error('Failed to save promotion');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setFormData({
      brand_id: promotion.brand_id,
      name: promotion.name,
      code: promotion.code || '',
      type: promotion.type,
      value: promotion.value.toString(),
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      platforms: promotion.platforms,
      notes: promotion.notes || '',
      is_active: promotion.is_active,
    });
    setEditingId(promotion.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);

      if (error) throw error;
      toast.success('Promotion deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Failed to delete promotion');
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const getBrandName = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.name || 'Unknown';
  };

  const getPromoStatus = (promo: Promotion) => {
    if (!promo.is_active) return 'inactive';
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);

    if (isBefore(now, start)) return 'scheduled';
    if (isAfter(now, end)) return 'expired';
    return 'active';
  };

  const getTypeLabel = (type: PromotionType) => {
    return PROMOTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const formatValue = (type: PromotionType, value: number) => {
    switch (type) {
      case 'percentage':
        return `${value}%`;
      case 'fixed_amount':
        return formatCurrency(value);
      case 'free_shipping':
        return 'Free';
      case 'bogo':
        return 'BOGO';
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promotions</h2>
          <p className="text-muted-foreground">
            Manage discounts and promotional campaigns
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Promotion</DialogTitle>
              <DialogDescription>
                Create a new promotion or discount
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
                <div className="space-y-2 flex items-end gap-2">
                  <Switch
                    id="is-active"
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label htmlFor="is-active">Active</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Summer Sale"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    placeholder="e.g., SUMMER20"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as PromotionType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={formData.type === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="flex gap-4">
                  {PLATFORMS.map((platform) => (
                    <label key={platform} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.platforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                        className="rounded"
                      />
                      <span className="capitalize">{platform}</span>
                    </label>
                  ))}
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
                {editingId ? 'Update' : 'Add'} Promotion
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
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Platforms</TableHead>
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
              ) : promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No promotions yet. Click "Add Promotion" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((promo) => {
                  const status = getPromoStatus(promo);
                  return (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <Badge
                          variant={status === 'active' ? 'default' : 'secondary'}
                          className={
                            status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : status === 'scheduled'
                                ? 'bg-blue-100 text-blue-700'
                                : status === 'expired'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{promo.name}</TableCell>
                      <TableCell>{getBrandName(promo.brand_id)}</TableCell>
                      <TableCell>
                        {promo.code ? (
                          <code className="bg-muted px-1 py-0.5 rounded text-sm">{promo.code}</code>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getTypeLabel(promo.type)}</TableCell>
                      <TableCell>{formatValue(promo.type, promo.value)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(promo.start_date), 'MMM d')} -{' '}
                        {format(new Date(promo.end_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {promo.platforms.map((p) => (
                            <Badge key={p} variant="outline" className="capitalize text-xs">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(promo)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(promo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
