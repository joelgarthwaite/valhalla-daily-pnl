'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPercentage, getQuartersForYear } from '@/lib/pnl/targets';
import type { QuarterlyGoal, Brand } from '@/types';

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export default function QuarterlyGoalsPage() {
  const [goals, setGoals] = useState<QuarterlyGoal[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    brand_id: '',
    year: currentYear.toString(),
    quarter: '',
    revenue_target: '',
    gross_margin_target: '70',
    net_margin_target: '25',
    notes: '',
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: goalsData }, { data: brandsData }] = await Promise.all([
        supabase
          .from('quarterly_goals')
          .select('*')
          .order('year', { ascending: false })
          .order('quarter', { ascending: false }),
        supabase.from('brands').select('*'),
      ]);

      setGoals(goalsData || []);
      setBrands(brandsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load goals data');
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
      year: currentYear.toString(),
      quarter: '',
      revenue_target: '',
      gross_margin_target: '70',
      net_margin_target: '25',
      notes: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.brand_id || !formData.quarter || !formData.revenue_target) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const payload = {
        brand_id: formData.brand_id,
        year: parseInt(formData.year),
        quarter: parseInt(formData.quarter) as 1 | 2 | 3 | 4,
        revenue_target: parseFloat(formData.revenue_target) || 0,
        gross_margin_target: parseFloat(formData.gross_margin_target) || 70,
        net_margin_target: parseFloat(formData.net_margin_target) || 25,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('quarterly_goals')
          .update(payload as never)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Goal updated');
      } else {
        const { error } = await supabase.from('quarterly_goals').insert(payload as never);

        if (error) {
          if (error.code === '23505') {
            toast.error('A goal for this brand/quarter already exists');
            return;
          }
          throw error;
        }
        toast.success('Goal added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    }
  };

  const handleEdit = (goal: QuarterlyGoal) => {
    setFormData({
      brand_id: goal.brand_id,
      year: goal.year.toString(),
      quarter: goal.quarter.toString(),
      revenue_target: goal.revenue_target.toString(),
      gross_margin_target: goal.gross_margin_target.toString(),
      net_margin_target: goal.net_margin_target.toString(),
      notes: goal.notes || '',
    });
    setEditingId(goal.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const { error } = await supabase.from('quarterly_goals').delete().eq('id', id);

      if (error) throw error;
      toast.success('Goal deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const getBrandName = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.name || 'Unknown';
  };

  const isCurrentQuarter = (year: number, quarter: number) => {
    const now = new Date();
    const currentQ = Math.ceil((now.getMonth() + 1) / 3);
    return year === now.getFullYear() && quarter === currentQ;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quarterly Goals</h2>
          <p className="text-muted-foreground">
            Set revenue and margin targets for each quarter
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Quarterly Goal</DialogTitle>
              <DialogDescription>
                Set revenue and margin targets for a quarter
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(v) => setFormData({ ...formData, year: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quarter *</Label>
                  <Select
                    value={formData.quarter}
                    onValueChange={(v) => setFormData({ ...formData, quarter: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                      <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                      <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                      <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Revenue Target (£) *</Label>
                <Input
                  type="number"
                  step="1000"
                  placeholder="e.g., 100000"
                  value={formData.revenue_target}
                  onChange={(e) => setFormData({ ...formData, revenue_target: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Weekly: {formData.revenue_target ? formatCurrency(parseFloat(formData.revenue_target) / 13) : '£0'} |
                  Daily: {formData.revenue_target ? formatCurrency(parseFloat(formData.revenue_target) / 91) : '£0'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gross Margin Target (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="70"
                    value={formData.gross_margin_target}
                    onChange={(e) => setFormData({ ...formData, gross_margin_target: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Net Margin Target (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="25"
                    value={formData.net_margin_target}
                    onChange={(e) => setFormData({ ...formData, net_margin_target: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes about this target..."
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
                {editingId ? 'Update' : 'Add'} Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Revenue Target</TableHead>
                <TableHead className="text-right">Weekly</TableHead>
                <TableHead className="text-right">Daily</TableHead>
                <TableHead className="text-right">GM Target</TableHead>
                <TableHead className="text-right">NM Target</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : goals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No goals set yet. Click "Add Goal" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                goals.map((goal) => {
                  const weeklyTarget = goal.revenue_target / 13;
                  const dailyTarget = goal.revenue_target / 91;
                  const isCurrent = isCurrentQuarter(goal.year, goal.quarter);

                  return (
                    <TableRow key={goal.id} className={isCurrent ? 'bg-blue-50/50' : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Q{goal.quarter} {goal.year}</span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getBrandName(goal.brand_id)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(goal.revenue_target)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(weeklyTarget)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(dailyTarget)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(goal.gross_margin_target)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(goal.net_margin_target)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(goal)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(goal.id)}
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
