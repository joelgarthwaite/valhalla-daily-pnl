'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, ArrowRight } from 'lucide-react';
import type { ColumnMapping, RawRow } from '@/lib/parsing/types';

interface ManualColumnMapperProps {
  headers: string[];
  rawRows: RawRow[];
  initialMapping: ColumnMapping | null;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const FIELD_OPTIONS = [
  { value: 'tracking', label: 'Tracking Number', required: true },
  { value: 'cost', label: 'Cost/Amount', required: true },
  { value: 'date', label: 'Date', required: false },
  { value: 'service', label: 'Service Type', required: false },
  { value: 'weight', label: 'Weight', required: false },
  { value: 'currency', label: 'Currency', required: false },
];

const PREVIEW_ROWS = 5;

export function ManualColumnMapper({
  headers,
  rawRows,
  initialMapping,
  onConfirm,
  onCancel,
}: ManualColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    return initialMapping || {
      tracking: null,
      cost: null,
      date: null,
      service: null,
      weight: null,
      currency: null,
    };
  });

  // Get sample rows for preview
  const sampleRows = rawRows.slice(0, PREVIEW_ROWS);

  // Check which required fields are mapped
  const missingRequired = FIELD_OPTIONS.filter(
    (field) => field.required && mapping[field.value as keyof ColumnMapping] === null
  );

  const canConfirm = missingRequired.length === 0;

  // Handle column assignment
  const handleColumnChange = (field: keyof ColumnMapping, headerIndex: string) => {
    const index = headerIndex === 'none' ? null : parseInt(headerIndex, 10);

    setMapping((prev) => {
      const newMapping = { ...prev };

      // If this column was assigned to another field, clear it
      if (index !== null) {
        for (const key of Object.keys(newMapping) as (keyof ColumnMapping)[]) {
          if (newMapping[key] === index && key !== field) {
            newMapping[key] = null;
          }
        }
      }

      newMapping[field] = index;
      return newMapping;
    });
  };

  // Get the field assigned to a column
  const getFieldForColumn = (columnIndex: number): keyof ColumnMapping | null => {
    for (const [field, index] of Object.entries(mapping)) {
      if (index === columnIndex) {
        return field as keyof ColumnMapping;
      }
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Manual Column Mapping Required
        </CardTitle>
        <CardDescription>
          We couldn&apos;t automatically detect all required columns. Please map the columns
          below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Column Mapping Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIELD_OPTIONS.map((field) => (
            <div key={field.value} className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                {field.label}
                {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
              </label>
              <Select
                value={
                  mapping[field.value as keyof ColumnMapping] !== null
                    ? String(mapping[field.value as keyof ColumnMapping])
                    : 'none'
                }
                onValueChange={(value) =>
                  handleColumnChange(field.value as keyof ColumnMapping, value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Not mapped --</SelectItem>
                  {headers.map((header, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {header || `Column ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Preview Table */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Data Preview</h3>
          <p className="text-xs text-muted-foreground">
            Showing first {sampleRows.length} rows. Mapped columns are highlighted.
          </p>
          <div className="border rounded-lg overflow-auto max-h-[300px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  {headers.map((header, index) => {
                    const assignedField = getFieldForColumn(index);
                    const fieldConfig = assignedField
                      ? FIELD_OPTIONS.find((f) => f.value === assignedField)
                      : null;

                    return (
                      <TableHead
                        key={index}
                        className={assignedField ? 'bg-primary/10' : ''}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{header || `Col ${index + 1}`}</span>
                          {fieldConfig && (
                            <Badge
                              variant="outline"
                              className="text-xs w-fit bg-primary/20"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {fieldConfig.label}
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {headers.map((header, colIndex) => {
                      const assignedField = getFieldForColumn(colIndex);
                      return (
                        <TableCell
                          key={colIndex}
                          className={`font-mono text-sm ${
                            assignedField ? 'bg-primary/5' : ''
                          }`}
                        >
                          {String(row[header] || '')}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Missing Fields Warning */}
        {missingRequired.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Missing required columns:</strong>{' '}
              {missingRequired.map((f) => f.label).join(', ')}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(mapping)}
            disabled={!canConfirm}
            className="flex-1"
          >
            Confirm Mapping
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
