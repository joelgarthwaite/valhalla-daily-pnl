'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Building2, CheckCircle, XCircle, RefreshCw, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import type { Brand } from '@/types';

interface XeroConnection {
  id: string;
  brand_id: string;
  tenant_id: string;
  tenant_name: string;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
}

interface BrandWithConnection extends Brand {
  connection?: XeroConnection;
}

export default function XeroAdminPage() {
  const [brands, setBrands] = useState<BrandWithConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      if (brandsError) throw brandsError;

      // Fetch Xero connections
      const { data: connections, error: connError } = await supabase
        .from('xero_connections')
        .select('*');

      if (connError) throw connError;

      // Merge connections with brands
      const brandsWithConnections: BrandWithConnection[] = (brandsData || []).map((brand: Brand) => ({
        ...brand,
        connection: connections?.find((c: XeroConnection) => c.brand_id === brand.id),
      }));

      setBrands(brandsWithConnections);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load Xero settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnect = (brandCode: string) => {
    // Redirect to Xero OAuth
    window.location.href = `/api/xero/auth?brand=${brandCode}`;
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('xero_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Xero disconnected');
      fetchData();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect Xero');
    }
  };

  const handleRefreshToken = async (connection: XeroConnection) => {
    setIsRefreshing(connection.id);
    try {
      // Trigger a balance fetch which will refresh the token if needed
      const response = await fetch('/api/xero/balances');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Refresh failed');
      }

      toast.success('Token refreshed successfully');
      fetchData(); // Reload to get updated expiry
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Failed to refresh token');
    } finally {
      setIsRefreshing(null);
    }
  };

  const getConnectionStatus = (connection?: XeroConnection) => {
    if (!connection) {
      return { status: 'disconnected', color: 'gray', text: 'Not Connected' };
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 0) {
      return { status: 'expired', color: 'red', text: 'Token Expired' };
    }

    if (hoursUntilExpiry < 1) {
      return { status: 'expiring', color: 'yellow', text: 'Expiring Soon' };
    }

    return { status: 'connected', color: 'green', text: 'Connected' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          Xero Integration
        </h2>
        <p className="text-muted-foreground">
          Connect Xero to display real-time bank balances on your dashboard
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Xero Integration
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Each brand connects to its own Xero organization</li>
            <li>Bank account balances are displayed on the main dashboard</li>
            <li>Credit cards shared across brands are deduplicated automatically</li>
            <li>Tokens auto-refresh every 30 minutes - no manual action needed</li>
          </ul>
        </CardContent>
      </Card>

      {/* Connections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Connections</CardTitle>
          <CardDescription>
            Connect each brand to its Xero organization to fetch bank balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Xero Organization</TableHead>
                <TableHead>Token Expires</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                brands.map(brand => {
                  const { status, color, text } = getConnectionStatus(brand.connection);
                  const isConnected = !!brand.connection;

                  return (
                    <TableRow key={brand.id}>
                      <TableCell>
                        <div className="font-medium">{brand.name}</div>
                        <div className="text-xs text-muted-foreground">{brand.code}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status === 'connected' ? 'default' : 'secondary'}
                          className={
                            status === 'connected'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              : status === 'expiring'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                              : status === 'expired'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : ''
                          }
                        >
                          {status === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {status === 'expiring' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                          {text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {brand.connection?.tenant_name || '-'}
                      </TableCell>
                      <TableCell>
                        {brand.connection ? (
                          <div>
                            <div className="text-sm">
                              {format(new Date(brand.connection.token_expires_at), 'MMM d, HH:mm')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(brand.connection.token_expires_at), { addSuffix: true })}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {brand.connection ? (
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(brand.connection.updated_at), { addSuffix: true })}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRefreshToken(brand.connection!)}
                                disabled={isRefreshing === brand.connection?.id}
                              >
                                <RefreshCw
                                  className={`h-4 w-4 mr-1 ${
                                    isRefreshing === brand.connection?.id ? 'animate-spin' : ''
                                  }`}
                                />
                                Refresh
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Disconnect Xero?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove the connection to {brand.name}&apos;s Xero organization.
                                      Bank balances will no longer be displayed for this brand.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDisconnect(brand.connection!.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Disconnect
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleConnect(brand.code)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Connect Xero
                            </Button>
                          )}
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

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
              <div>
                <p className="font-medium">Create a Xero App</p>
                <p className="text-muted-foreground">
                  Go to{' '}
                  <a
                    href="https://developer.xero.com/app/manage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    developer.xero.com/app/manage
                  </a>{' '}
                  and create a new app (or use existing)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
              <div>
                <p className="font-medium">Configure OAuth Settings</p>
                <p className="text-muted-foreground">
                  Set the redirect URI to:{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">
                    https://pnl.displaychamp.com/api/xero/callback
                  </code>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">3</span>
              <div>
                <p className="font-medium">Add Environment Variables</p>
                <p className="text-muted-foreground">
                  Copy Client ID and Secret to Vercel environment variables:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs mt-1 overflow-x-auto">
{`XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret`}
                </pre>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">4</span>
              <div>
                <p className="font-medium">Connect Each Brand</p>
                <p className="text-muted-foreground">
                  Click &quot;Connect Xero&quot; above for each brand and authorize the connection
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
