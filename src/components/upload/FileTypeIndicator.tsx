'use client';

import type { FileType } from '@/lib/parsing/types';
import { FileSpreadsheet, FileText, FileType2, FileQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FileTypeIndicatorProps {
  fileType: FileType;
  className?: string;
}

const fileTypeConfig: Record<FileType, {
  icon: React.ElementType;
  label: string;
  color: string;
}> = {
  csv: {
    icon: FileText,
    label: 'CSV',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  xlsx: {
    icon: FileSpreadsheet,
    label: 'Excel',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  xls: {
    icon: FileSpreadsheet,
    label: 'Excel (Legacy)',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  pdf: {
    icon: FileType2,
    label: 'PDF',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  unknown: {
    icon: FileQuestion,
    label: 'Unknown',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

export function FileTypeIndicator({ fileType, className = '' }: FileTypeIndicatorProps) {
  const config = fileTypeConfig[fileType] || fileTypeConfig.unknown;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} ${className}`} variant="outline">
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
