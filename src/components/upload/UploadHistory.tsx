'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import type { UploadHistory as UploadHistoryType, UploadMode } from '@/types';
import { Clock, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const modeLabels: Record<UploadMode, string> = {
  add_only: 'Add only',
  overwrite_all: 'Overwrite',
  update_if_higher: 'Higher',
  update_if_lower: 'Lower',
  add_to_existing: 'Add to cost',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

interface UploadHistoryProps {
  limit?: number;
}

export function UploadHistoryDisplay({ limit = 10 }: UploadHistoryProps) {
  const [history, setHistory] = useState<UploadHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  const fetchHistory = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('upload_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching upload history:', error);
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
            <CardDescription>
              Upload history for audit trail
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHistory(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No upload history yet</p>
            <p className="text-sm">Upload an invoice to see it here</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Blocked</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="whitespace-nowrap">
                      <span title={formatDate(upload.created_at)}>
                        {formatRelativeTime(upload.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={upload.file_name || '-'}>
                      {upload.file_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={upload.carrier === 'dhl' ? 'default' : 'secondary'}>
                        {upload.carrier === 'dhl' ? 'DHL' : 'Royal Mail'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {modeLabels[upload.upload_mode]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {upload.created_count > 0 ? (
                        <span className="text-green-600 font-medium">{upload.created_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {upload.updated_count > 0 ? (
                        <span className="text-blue-600 font-medium">{upload.updated_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">{upload.skipped_count}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {upload.blocked_count > 0 ? (
                        <span className="text-yellow-600 font-medium">{upload.blocked_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {upload.error_count > 0 ? (
                        <span className="text-red-600 font-medium">{upload.error_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
