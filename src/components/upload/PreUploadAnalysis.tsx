'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnalysisResult, RecordAction } from '@/types';
import { Plus, RefreshCw, SkipForward, Ban, AlertTriangle, PlusCircle } from 'lucide-react';

interface PreUploadAnalysisProps {
  analysis: AnalysisResult;
  showDetails?: boolean;
}

const actionConfig: Record<RecordAction, { label: string; icon: React.ReactNode; color: string }> = {
  create: {
    label: 'Create',
    icon: <Plus className="h-3 w-3" />,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  update: {
    label: 'Update',
    icon: <RefreshCw className="h-3 w-3" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  add: {
    label: 'Add',
    icon: <PlusCircle className="h-3 w-3" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  skip: {
    label: 'Skip',
    icon: <SkipForward className="h-3 w-3" />,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  blocked: {
    label: 'Blocked',
    icon: <Ban className="h-3 w-3" />,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
};

export function PreUploadAnalysis({ analysis, showDetails = true }: PreUploadAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Analysis</CardTitle>
        <CardDescription>
          Preview what will happen when you process this upload
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <div className="space-y-2">
            {analysis.warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{analysis.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{analysis.toCreate}</p>
            <p className="text-sm text-green-700">Create</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{analysis.toUpdate}</p>
            <p className="text-sm text-blue-700">Update</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{analysis.toAdd || 0}</p>
            <p className="text-sm text-purple-700">Add</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{analysis.toSkip}</p>
            <p className="text-sm text-gray-700">Skip</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{analysis.toBlock}</p>
            <p className="text-sm text-red-700">Blocked</p>
          </div>
        </div>

        {/* Detailed table */}
        {showDetails && analysis.records.length > 0 && (
          <div className="max-h-[400px] overflow-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">New Cost</TableHead>
                  <TableHead className="text-right">Existing Cost</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.records.slice(0, 100).map((record, index) => (
                  <TableRow
                    key={index}
                    className={
                      record.action === 'blocked'
                        ? 'bg-red-50/50'
                        : record.action === 'create'
                        ? 'bg-green-50/50'
                        : record.action === 'update'
                        ? 'bg-blue-50/50'
                        : record.action === 'add'
                        ? 'bg-purple-50/50'
                        : ''
                    }
                  >
                    <TableCell className="font-mono text-sm">
                      {record.tracking_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${actionConfig[record.action].color} flex items-center gap-1 w-fit`}
                      >
                        {actionConfig[record.action].icon}
                        {actionConfig[record.action].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      £{record.shipping_cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {record.existing_cost !== undefined ? (
                        <span className="flex items-center justify-end gap-1">
                          £{record.existing_cost.toFixed(2)}
                          {record.existing_cost_type === 'actual' && (
                            <span className="text-xs text-green-600">(actual)</span>
                          )}
                          {record.existing_cost_type === 'estimated' && (
                            <span className="text-xs text-yellow-600">(est.)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {record.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {analysis.records.length > 100 && (
              <div className="p-3 text-center text-sm text-muted-foreground border-t">
                Showing first 100 of {analysis.records.length} records
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
