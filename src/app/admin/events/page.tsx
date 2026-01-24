'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, Download, Calendar as CalendarIcon } from 'lucide-react';
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
import { AVAILABLE_COUNTRIES } from '@/lib/calendar/standard-events';
import type { CalendarEvent, Brand, EventCategory } from '@/types';

const EVENT_CATEGORIES: { value: EventCategory; label: string; color: string }[] = [
  { value: 'holiday', label: 'Holiday', color: '#ef4444' },
  { value: 'golf_tournament', label: 'Golf Tournament', color: '#22c55e' },
  { value: 'promotion', label: 'Promotion', color: '#f59e0b' },
  { value: 'internal', label: 'Internal', color: '#6366f1' },
  { value: 'other', label: 'Other', color: '#64748b' },
];

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export default function CalendarEventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    brand_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    title: '',
    category: '' as EventCategory | '',
    description: '',
    is_recurring: false,
    color: '#3b82f6',
  });

  // Import form state
  const [importData, setImportData] = useState({
    year: new Date().getFullYear(),
    countries: ['UK', 'US'] as string[],
    replaceExisting: false,
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: eventsData }, { data: brandsData }] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .order('date', { ascending: false }),
        supabase.from('brands').select('*'),
      ]);

      setEvents(eventsData || []);
      setBrands(brandsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load events');
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
      title: '',
      category: '',
      description: '',
      is_recurring: false,
      color: '#3b82f6',
    });
    setEditingId(null);
  };

  const handleCategoryChange = (category: EventCategory) => {
    const categoryDef = EVENT_CATEGORIES.find((c) => c.value === category);
    setFormData((prev) => ({
      ...prev,
      category,
      color: categoryDef?.color || prev.color,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.date) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const payload = {
        brand_id: formData.brand_id || null,
        date: formData.date,
        title: formData.title,
        category: formData.category || null,
        description: formData.description || null,
        is_recurring: formData.is_recurring,
        color: formData.color,
      };

      if (editingId) {
        const { error } = await supabase
          .from('calendar_events')
          .update(payload as never)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Event updated');
      } else {
        const { error } = await supabase.from('calendar_events').insert(payload as never);

        if (error) throw error;
        toast.success('Event added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setFormData({
      brand_id: event.brand_id || '',
      date: event.date,
      title: event.title,
      category: event.category || '',
      description: event.description || '',
      is_recurring: event.is_recurring,
      color: event.color,
    });
    setEditingId(event.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);

      if (error) throw error;
      toast.success('Event deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const getBrandName = (brandId: string | null) => {
    if (!brandId) return 'All Brands';
    return brands.find((b) => b.id === brandId)?.name || 'Unknown';
  };

  const getCategoryLabel = (category: EventCategory | null) => {
    if (!category) return 'Other';
    return EVENT_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const handleImportStandardEvents = async () => {
    setIsImporting(true);
    try {
      const response = await fetch('/api/calendar/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import events');
      }

      toast.success(`Imported ${result.count} events for ${importData.year}`);
      setIsImportDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error importing events:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import events');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleCountry = (countryCode: string) => {
    setImportData((prev) => {
      const countries = prev.countries.includes(countryCode)
        ? prev.countries.filter((c) => c !== countryCode)
        : [...prev.countries, countryCode];
      return { ...prev, countries };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Events</h2>
          <p className="text-muted-foreground">
            Track important dates, holidays, and golf tournaments
          </p>
        </div>
        <div className="flex gap-2">
          {/* Import Standard Events Dialog */}
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Import Standard Events
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Standard Events</DialogTitle>
                <DialogDescription>
                  Import holidays, promotions, and golf tournaments for a specific year
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    min={2020}
                    max={2030}
                    value={importData.year}
                    onChange={(e) => setImportData({ ...importData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Countries</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which country-specific holidays to include
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COUNTRIES.map((country) => (
                      <Button
                        key={country.code}
                        type="button"
                        variant={importData.countries.includes(country.code) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleCountry(country.code)}
                      >
                        {country.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="replace-existing"
                    checked={importData.replaceExisting}
                    onCheckedChange={(v) => setImportData({ ...importData, replaceExisting: v })}
                  />
                  <Label htmlFor="replace-existing">Replace existing recurring events for this year</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportStandardEvents} disabled={isImporting || importData.countries.length === 0}>
                  {isImporting ? 'Importing...' : 'Import Events'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Event Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Event</DialogTitle>
              <DialogDescription>
                Add a calendar event to track important dates
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select
                    value={formData.brand_id}
                    onValueChange={(v) => setFormData({ ...formData, brand_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Brands</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., The Masters Tournament"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => handleCategoryChange(v as EventCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-1 p-2 border rounded-md">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full transition-transform ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is-recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(v) => setFormData({ ...formData, is_recurring: v })}
                />
                <Label htmlFor="is-recurring">Recurring annually</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingId ? 'Update' : 'Add'} Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Color</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Recurring</TableHead>
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
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No events yet. Click "Add Event" or "Import Standard Events" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(event.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(event.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      {event.country ? (
                        <Badge variant="secondary">{event.country}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Global</span>
                      )}
                    </TableCell>
                    <TableCell>{getBrandName(event.brand_id)}</TableCell>
                    <TableCell>
                      {event.is_recurring && (
                        <Badge variant="secondary">Yearly</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(event.id)}
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
