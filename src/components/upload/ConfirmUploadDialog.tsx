'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { AnalysisResult, UploadMode } from '@/types';
import { useState } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';

interface ConfirmUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: AnalysisResult;
  uploadMode: UploadMode;
  carrier: 'dhl' | 'royalmail';
  onConfirm: () => void;
  loading?: boolean;
}

const modeLabels: Record<UploadMode, string> = {
  add_only: 'Add new only',
  overwrite_all: 'Overwrite all',
  update_if_higher: 'Update if higher',
  update_if_lower: 'Update if lower',
  add_to_existing: 'Add to existing cost',
};

export function ConfirmUploadDialog({
  open,
  onOpenChange,
  analysis,
  uploadMode,
  carrier,
  onConfirm,
  loading = false,
}: ConfirmUploadDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Reset confirmation when dialog opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmed(false);
    }
    onOpenChange(isOpen);
  };

  const hasChanges = analysis.toCreate > 0 || analysis.toUpdate > 0 || (analysis.toAdd || 0) > 0;
  const hasBlockedRecords = analysis.toBlock > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Upload</DialogTitle>
          <DialogDescription>
            Review the upload summary before processing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Carrier</p>
              <p className="font-medium capitalize">{carrier === 'royalmail' ? 'Royal Mail' : 'DHL Express'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Upload Mode</p>
              <p className="font-medium">{modeLabels[uploadMode]}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="border rounded-lg p-4 space-y-2">
            <p className="font-medium">Upload Summary</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total records:</span>
                <span className="font-mono">{analysis.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">To create:</span>
                <span className="font-mono text-green-600">{analysis.toCreate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">To update:</span>
                <span className="font-mono text-blue-600">{analysis.toUpdate}</span>
              </div>
              {(analysis.toAdd || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-purple-600">To add:</span>
                  <span className="font-mono text-purple-600">{analysis.toAdd}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">To skip:</span>
                <span className="font-mono text-muted-foreground">{analysis.toSkip}</span>
              </div>
              {hasBlockedRecords && (
                <div className="flex justify-between col-span-2">
                  <span className="text-red-600">Blocked:</span>
                  <span className="font-mono text-red-600">{analysis.toBlock}</span>
                </div>
              )}
            </div>
          </div>

          {/* Warnings */}
          {(hasBlockedRecords || carrier === 'royalmail') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 space-y-1">
                  {hasBlockedRecords && (
                    <p>
                      <strong>{analysis.toBlock} records blocked</strong> - these would overwrite verified actual costs with estimates.
                    </p>
                  )}
                  {carrier === 'royalmail' && (
                    <p>Royal Mail costs are estimates based on country averages.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Confirmation checkbox */}
          {hasChanges && (
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">
                I understand this will{' '}
                {analysis.toCreate > 0 && `create ${analysis.toCreate} new record${analysis.toCreate > 1 ? 's' : ''}`}
                {analysis.toCreate > 0 && (analysis.toUpdate > 0 || (analysis.toAdd || 0) > 0) && ' and '}
                {analysis.toUpdate > 0 && `update ${analysis.toUpdate} existing record${analysis.toUpdate > 1 ? 's' : ''}`}
                {analysis.toUpdate > 0 && (analysis.toAdd || 0) > 0 && ' and '}
                {(analysis.toAdd || 0) > 0 && `add duties/taxes to ${analysis.toAdd} existing record${(analysis.toAdd || 0) > 1 ? 's' : ''}`}
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading || (hasChanges && !confirmed)}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Process Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
