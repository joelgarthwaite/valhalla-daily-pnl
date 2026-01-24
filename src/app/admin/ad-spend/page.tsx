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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/pnl/targets';
import type { AdSpend, Brand, AdPlatform } from '@/types';
import { Info } from 'lucide-react';

const AD_PLATFORMS: { value: AdPlatform; label: string }[] = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'microsoft', label: 'Microsoft (Bing)' },
  { value: 'etsy_ads', label: 'Etsy Ads' },
];

export default function AdSpendPage() {
  const [adSpends, setAdSpends] = useState<AdSpend[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state - simplified without impressions/clicks/conversions
  const [formData, setFormData] = useState({
    brand_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    platform: '' as AdPlatform | '',
    spend: '',
    revenue_attributed: '',
    notes: '',
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: spends }, { data: brandsData }] = await Promise.all([
        supabase
          .from('ad_spend')
          .select('*')
          .order('date', { ascending: false })
          .limit(100),
        supabase.from('brands').select('*'),
      ]);

      setAdSpends(spends || []);
      setBrands(brandsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load ad spend data');
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
      date: format(new Date(), 'yyyy-MM-dd'),
      platform: '',
      spend: '',
      revenue_attributed: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.brand_id || !formData.platform || !formData.spend) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const payload = {
        brand_id: formData.brand_id,
        date: formData.date,
        platform: formData.platform as AdPlatform,
        spend: parseFloat(formData.spend) || 0,
        revenue_attributed: parseFloat(formData.revenue_attributed) || 0,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('ad_spend')
          .update(payload as never)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Ad spend updated');
      } else {
        const { error } = await supabase.from('ad_spend').insert(payload as never);

        if (error) throw error;
        toast.success('Ad spend added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving ad spend:', error);
      toast.error('Failed to save ad spend');
    }
  };

  const handleEdit = (adSpend: AdSpend) => {
    setFormData({
      brand_id: adSpend.brand_id,
      date: adSpend.date,
      platform: adSpend.platform,
      spend: adSpend.spend.toString(),
      revenue_attributed: adSpend.revenue_attributed.toString(),
      notes: adSpend.notes || '',
    });
    setEditingId(adSpend.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase.from('ad_spend').delete().eq('id', id);

      if (error) throw error;
      toast.success('Ad spend deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting ad spend:', error);
      toast.error('Failed to delete ad spend');
    }
  };

  const getBrandName = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.name || 'Unknown';
  };

  const getPlatformLabel = (platform: AdPlatform) => {
    return AD_PLATFORMS.find((p) => p.value === platform)?.label || platform;
  };

  // Calculate summary metrics
  const totalSpend = adSpends.reduce((sum, a) => sum + a.spend, 0);
  const totalRevenue = adSpends.reduce((sum, a) => sum + a.revenue_attributed, 0);
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const mer = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ad Spend</h2>
          <p className="text-muted-foreground">
            Track advertising spend across platforms
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Ad Spend
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Ad Spend</DialogTitle>
              <DialogDescription>
                Enter the advertising spend details for a specific day
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
                  <Label>Platform *</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(v) => setFormData({ ...formData, platform: v as AdPlatform })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_PLATFORMS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Spend *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.spend}
                    onChange={(e) => setFormData({ ...formData, spend: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>Revenue Attributed (Optional)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Revenue reported by the ad platform. Used for platform-specific ROAS. Total MER is calculated using blended attribution.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.revenue_attributed}
                  onChange={(e) => setFormData({ ...formData, revenue_attributed: e.target.value })}
                />
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
                {editingId ? 'Update' : 'Add'} Ad Spend
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Spend</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Blended ROAS</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Return on Ad Spend based on platform-attributed revenue</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold">{blendedRoas.toFixed(2)}x</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">MER</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Marketing Efficiency Ratio: Total revenue per unit of ad spend. Higher is better.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold">{mer.toFixed(2)}x</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
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
              ) : adSpends.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No ad spend data yet. Click "Add Ad Spend" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                adSpends.map((adSpend) => {
                  const roas = adSpend.spend > 0
                    ? adSpend.revenue_attributed / adSpend.spend
                    : 0;
                  return (
                    <TableRow key={adSpend.id}>
                      <TableCell>{format(new Date(adSpend.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getBrandName(adSpend.brand_id)}</TableCell>
                      <TableCell>{getPlatformLabel(adSpend.platform)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(adSpend.spend)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(adSpend.revenue_attributed)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {roas.toFixed(2)}x
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(adSpend)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(adSpend.id)}
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
