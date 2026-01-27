'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UploadMode, UploadModeOption } from '@/types';
import { Plus, RefreshCw, TrendingUp, TrendingDown, PlusCircle } from 'lucide-react';

const uploadModes: UploadModeOption[] = [
  {
    value: 'add_only',
    label: 'Add new only',
    description: 'Only create new records, never update existing ones',
    newRecords: 'Create',
    existingSameCost: 'Skip',
    existingDifferentCost: 'Skip',
  },
  {
    value: 'overwrite_all',
    label: 'Overwrite all',
    description: 'Update all existing records with new costs',
    newRecords: 'Create',
    existingSameCost: 'Skip (unchanged)',
    existingDifferentCost: 'Update',
  },
  {
    value: 'update_if_higher',
    label: 'Update if higher',
    description: 'Only update if new cost is higher than existing',
    newRecords: 'Create',
    existingSameCost: 'Skip',
    existingDifferentCost: 'Update if new > existing',
  },
  {
    value: 'update_if_lower',
    label: 'Update if lower',
    description: 'Only update if new cost is lower than existing',
    newRecords: 'Create',
    existingSameCost: 'Skip',
    existingDifferentCost: 'Update if new < existing',
  },
  {
    value: 'add_to_existing',
    label: 'Add to existing cost',
    description: 'Add invoice amount to existing shipping cost (for duties/taxes)',
    newRecords: 'Skip (no existing shipment)',
    existingSameCost: 'Add amounts together',
    existingDifferentCost: 'Add amounts together',
  },
];

const modeIcons: Record<UploadMode, React.ReactNode> = {
  add_only: <Plus className="h-5 w-5" />,
  overwrite_all: <RefreshCw className="h-5 w-5" />,
  update_if_higher: <TrendingUp className="h-5 w-5" />,
  update_if_lower: <TrendingDown className="h-5 w-5" />,
  add_to_existing: <PlusCircle className="h-5 w-5" />,
};

interface UploadModeSelectorProps {
  value: UploadMode;
  onChange: (mode: UploadMode) => void;
}

export function UploadModeSelector({ value, onChange }: UploadModeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Mode</CardTitle>
        <CardDescription>
          Choose how to handle existing records when uploading invoice data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={(v) => onChange(v as UploadMode)} className="space-y-3">
          {uploadModes.map((mode) => (
            <div
              key={mode.value}
              className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                value === mode.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onChange(mode.value)}
            >
              <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{modeIcons[mode.value]}</span>
                  <Label htmlFor={mode.value} className="font-medium cursor-pointer">
                    {mode.label}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Mode behavior table */}
        <div className="mt-6 rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Mode</th>
                <th className="text-left p-3 font-medium">New Records</th>
                <th className="text-left p-3 font-medium">Same Cost</th>
                <th className="text-left p-3 font-medium">Different Cost</th>
              </tr>
            </thead>
            <tbody>
              {uploadModes.map((mode) => (
                <tr
                  key={mode.value}
                  className={value === mode.value ? 'bg-primary/10' : ''}
                >
                  <td className="p-3 font-medium">{mode.label}</td>
                  <td className="p-3 text-green-600">{mode.newRecords}</td>
                  <td className="p-3 text-muted-foreground">{mode.existingSameCost}</td>
                  <td className="p-3">{mode.existingDifferentCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
