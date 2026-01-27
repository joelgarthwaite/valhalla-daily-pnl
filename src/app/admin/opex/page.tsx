'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, Copy, Building2, Users, Monitor, Briefcase, Megaphone, Shield, Wrench, Car, Landmark, MoreHorizontal } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/pnl/targets';
import type { OperatingExpense, Brand, OpexCategory, OpexFrequency } from '@/types';
import { OPEX_CATEGORY_LABELS, OPEX_FREQUENCY_LABELS } from '@/types';

const CATEGORY_ICONS: Record<OpexCategory, React.ElementType> = {
  staff: Users,
  premises: Building2,
  software: Monitor,
  professional: Briefcase,
  marketing_other: Megaphone,
  insurance: Shield,
  equipment: Wrench,
  travel: Car,
  banking: Landmark,
  other: MoreHorizontal,
};

const CATEGORIES: OpexCategory[] = [
  'staff',
  'premises',
  'software',
  'professional',
  'marketing_other',
  'insurance',
  'equipment',
  'travel',
  'banking',
  'other',
];

const FREQUENCIES: OpexFrequency[] = ['monthly', 'quarterly', 'annual', 'one_time'];

// Convert any frequency to monthly equivalent
function toMonthlyAmount(amount: number, frequency: OpexFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'annual':
      return amount / 12;
    case 'one_time':
      return 0; // One-time expenses don't have a monthly equivalent
    default:
      return amount;
  }
}

// Convert any frequency to annual equivalent
function toAnnualAmount(amount: number, frequency: OpexFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'annual':
      return amount;
    case 'one_time':
      return amount;
    default:
      return amount;
  }
}

export default function OpexPage() {
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<OpexCategory | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    brand_id: '',
    name: '',
    description: '',
    category: '' as OpexCategory | '',
    amount: '',
    frequency: 'monthly' as OpexFrequency,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    expense_date: '',
    is_active: true,
    notes: '',
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: expensesData }, { data: brandsData }] = await Promise.all([
        supabase
          .from('operating_expenses')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        supabase.from('brands').select('*'),
      ]);

      setExpenses(expensesData || []);
      setBrands(brandsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load operating expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const activeExpenses = expenses.filter((e) => e.is_active);

    const totalMonthly = activeExpenses.reduce(
      (sum, e) => sum + toMonthlyAmount(e.amount, e.frequency),
      0
    );

    const totalAnnual = activeExpenses.reduce(
      (sum, e) => sum + toAnnualAmount(e.amount, e.frequency),
      0
    );

    const byCategory = CATEGORIES.reduce((acc, category) => {
      acc[category] = activeExpenses
        .filter((e) => e.category === category)
        .reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);
      return acc;
    }, {} as Record<OpexCategory, number>);

    // Daily allocation (for P&L calculations)
    const dailyAllocation = totalMonthly / 30.44; // Average days per month

    return { totalMonthly, totalAnnual, byCategory, dailyAllocation };
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (filterCategory === 'all') return expenses;
    return expenses.filter((e) => e.category === filterCategory);
  }, [expenses, filterCategory]);

  const resetForm = () => {
    setFormData({
      brand_id: '',
      name: '',
      description: '',
      category: '',
      amount: '',
      frequency: 'monthly',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      expense_date: '',
      is_active: true,
      notes: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const payload = {
        brand_id: formData.brand_id || null,
        name: formData.name,
        description: formData.description || null,
        category: formData.category as OpexCategory,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        expense_date: formData.frequency === 'one_time' ? formData.expense_date || null : null,
        is_active: formData.is_active,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('operating_expenses')
          .update(payload as never)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Expense updated');
      } else {
        const { error } = await supabase.from('operating_expenses').insert(payload as never);

        if (error) throw error;
        toast.success('Expense added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleEdit = (expense: OperatingExpense) => {
    setFormData({
      brand_id: expense.brand_id || '',
      name: expense.name,
      description: expense.description || '',
      category: expense.category,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      start_date: expense.start_date,
      end_date: expense.end_date || '',
      expense_date: expense.expense_date || '',
      is_active: expense.is_active,
      notes: expense.notes || '',
    });
    setEditingId(expense.id);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (expense: OperatingExpense) => {
    setFormData({
      brand_id: expense.brand_id || '',
      name: `${expense.name} (copy)`,
      description: expense.description || '',
      category: expense.category,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      start_date: format(new Date(), 'yyyy-MM-dd'), // Reset to today
      end_date: expense.end_date || '',
      expense_date: expense.expense_date || '',
      is_active: expense.is_active,
      notes: expense.notes || '',
    });
    setEditingId(null); // Not editing, creating new
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase.from('operating_expenses').delete().eq('id', id);

      if (error) throw error;
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const getBrandName = (brandId: string | null) => {
    if (!brandId) return 'All Brands';
    return brands.find((b) => b.id === brandId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Operating Expenses (OPEX)</h2>
          <p className="text-muted-foreground">
            Manage overhead costs like staff, premises, software, and professional services
          </p>
        </div>
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
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Operating Expense</DialogTitle>
              <DialogDescription>
                Add recurring or one-time overhead costs
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Office Rent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select
                    value={formData.brand_id || 'all'}
                    onValueChange={(v) => setFormData({ ...formData, brand_id: v === 'all' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands (Company-wide)</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category || undefined}
                    onValueChange={(v) => setFormData({ ...formData, category: v as OpexCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => {
                        const Icon = CATEGORY_ICONS[category];
                        return (
                          <SelectItem key={category} value={category}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {OPEX_CATEGORY_LABELS[category]}
                            </div>
                          </SelectItem>
                        );
                      })}
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
                  <Label>Amount (£) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v as OpexFrequency })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {OPEX_FREQUENCY_LABELS[freq]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {formData.frequency === 'one_time' && (
                <div className="space-y-2">
                  <Label>Expense Date</Label>
                  <Input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
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
                {editingId ? 'Update' : 'Add'} Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly OPEX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalMonthly)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(summary.dailyAllocation)}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Annual OPEX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalAnnual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Projected yearly total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Largest Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const entries = Object.entries(summary.byCategory).filter(([, v]) => v > 0);
              if (entries.length === 0) return <div className="text-2xl font-bold">-</div>;
              const [category, amount] = entries.sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {OPEX_CATEGORY_LABELS[category as OpexCategory]}
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenses.filter((e) => e.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {expenses.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown by Category</CardTitle>
          <CardDescription>
            Distribution of monthly operating expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {CATEGORIES.map((category) => {
              const amount = summary.byCategory[category];
              const Icon = CATEGORY_ICONS[category];
              const pct = summary.totalMonthly > 0 ? (amount / summary.totalMonthly) * 100 : 0;

              return (
                <div
                  key={category}
                  className={`p-3 rounded-lg border ${amount > 0 ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {OPEX_CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <div className="text-lg font-bold">{formatCurrency(amount)}</div>
                  {amount > 0 && (
                    <div className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter by category:</Label>
        <Select
          value={filterCategory}
          onValueChange={(v) => setFilterCategory(v as OpexCategory | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {OPEX_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Monthly Equiv.</TableHead>
                <TableHead>Period</TableHead>
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
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No operating expenses yet. Click &quot;Add Expense&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const Icon = CATEGORY_ICONS[expense.category];
                  const monthlyEquiv = toMonthlyAmount(expense.amount, expense.frequency);

                  return (
                    <TableRow key={expense.id} className={!expense.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <Badge
                          variant={expense.is_active ? 'default' : 'secondary'}
                          className={
                            expense.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {expense.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{expense.name}</div>
                        {expense.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {expense.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{OPEX_CATEGORY_LABELS[expense.category]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getBrandName(expense.brand_id)}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {OPEX_FREQUENCY_LABELS[expense.frequency]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {expense.frequency !== 'one_time' ? (
                          <span className="text-muted-foreground">
                            {formatCurrency(monthlyEquiv)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(expense.start_date), 'MMM d, yyyy')}
                        {expense.end_date && (
                          <> - {format(new Date(expense.end_date), 'MMM d, yyyy')}</>
                        )}
                        {!expense.end_date && expense.frequency !== 'one_time' && ' - Ongoing'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(expense)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                            title="Delete"
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

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How OPEX affects your P&L
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Operating expenses are deducted from GP3 (Contribution Margin after Ads) to calculate
            your <strong>True Net Profit</strong>. This gives you a complete picture of your
            business profitability.
          </p>
          <div className="text-sm text-blue-800 dark:text-blue-200 font-mono bg-blue-100 dark:bg-blue-900/40 p-3 rounded">
            <div>GP3 = {formatCurrency(0)} (Revenue - COGS - Ops Costs - Ad Spend)</div>
            <div>- OPEX = {formatCurrency(summary.dailyAllocation)}/day</div>
            <div className="border-t border-blue-300 dark:border-blue-700 mt-2 pt-2 font-bold">
              True Net Profit = GP3 - OPEX
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
