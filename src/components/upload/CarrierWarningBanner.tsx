'use client';

import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface CarrierWarningBannerProps {
  carrier: 'dhl' | 'royalmail';
}

export function CarrierWarningBanner({ carrier }: CarrierWarningBannerProps) {
  if (carrier === 'royalmail') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-yellow-800">Royal Mail - Estimated Costs</p>
            <p className="text-sm text-yellow-700">
              Royal Mail costs are <strong>estimates</strong> based on country averages from your invoice data.
              These are not verified costs from individual shipment invoices.
            </p>
            <div className="text-sm text-yellow-700 mt-2 space-y-1">
              <p className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Estimates cannot overwrite verified DHL costs
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-green-800">DHL Express - Actual Costs</p>
          <p className="text-sm text-green-700">
            DHL costs are <strong>verified actual costs</strong> from carrier invoices with direct tracking number matching.
          </p>
        </div>
      </div>
    </div>
  );
}
