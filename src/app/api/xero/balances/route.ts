import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  refreshXeroToken,
  fetchAllBalances,
  type AccountBalance,
} from '@/lib/xero/client';

/**
 * GET /api/xero/balances
 *
 * Fetch bank balances from Xero for all connected brands
 * Handles token refresh automatically
 *
 * Query params:
 *   brand: 'all' | 'DC' | 'BI' (default: 'all')
 */

interface XeroConnection {
  id: string;
  brand_id: string;
  tenant_id: string;
  tenant_name: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  brands?: {
    code: string;
    name: string;
  };
}

interface BrandBalance {
  brand: string;
  brandName: string;
  accountName: string;
  accountType: 'BANK' | 'CREDITCARD';
  balance: number;
  currency: string;
}

interface BalancesResponse {
  success: boolean;
  balances: BrandBalance[];
  totals: {
    totalCash: number;
    totalCredit: number;
    netPosition: number;
  };
  lastUpdated: string;
  errors?: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse<BalancesResponse | { error: string }>> {
  const { searchParams } = new URL(request.url);
  const brandFilter = searchParams.get('brand') || 'all';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Xero credentials not configured' },
      { status: 500 }
    );
  }

  try {
    // Build query for connections
    let query = supabase
      .from('xero_connections')
      .select(`
        id,
        brand_id,
        tenant_id,
        tenant_name,
        access_token,
        refresh_token,
        token_expires_at,
        brands!inner(code, name)
      `);

    // Filter by brand if specified
    if (brandFilter !== 'all') {
      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('code', brandFilter)
        .single();

      if (brand) {
        query = query.eq('brand_id', brand.id);
      }
    }

    const { data: connections, error } = await query;

    if (error) {
      console.error('Error fetching Xero connections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch Xero connections' },
        { status: 500 }
      );
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        balances: [],
        totals: { totalCash: 0, totalCredit: 0, netPosition: 0 },
        lastUpdated: new Date().toISOString(),
        errors: ['No Xero connections found. Connect Xero in Admin > Xero Settings.'],
      });
    }

    const allBalances: BrandBalance[] = [];
    const errors: string[] = [];

    // Track seen credit card accounts for deduplication
    const seenCreditCards = new Map<string, BrandBalance>();

    // Fetch balances for each connection
    for (const conn of connections as unknown as XeroConnection[]) {
      try {
        // Check if token needs refresh (with 5 minute buffer)
        const expiresAt = new Date(conn.token_expires_at);
        const now = new Date();
        const bufferMs = 5 * 60 * 1000; // 5 minutes

        let accessToken = conn.access_token;

        if (expiresAt.getTime() - now.getTime() < bufferMs) {
          // Refresh the token
          console.log(`Refreshing Xero token for ${conn.tenant_name}`);
          const newTokens = await refreshXeroToken(
            clientId,
            clientSecret,
            conn.refresh_token
          );

          accessToken = newTokens.access_token;

          // Update tokens in database
          const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
          await supabase
            .from('xero_connections')
            .update({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              token_expires_at: newExpiresAt.toISOString(),
            })
            .eq('id', conn.id);
        }

        // Fetch balances from Xero
        const balances = await fetchAllBalances(accessToken, conn.tenant_id);

        const brandCode = (conn.brands as { code: string; name: string }).code;
        const brandName = (conn.brands as { code: string; name: string }).name;

        for (const balance of balances) {
          // Deduplicate credit cards (shared Amex appears in both orgs)
          if (balance.accountType === 'CREDITCARD') {
            const key = balance.accountName.toLowerCase().trim();
            const existing = seenCreditCards.get(key);

            if (existing) {
              // Already seen this card, skip but keep the existing one
              // (Use first brand's version, both should have same balance)
              continue;
            }

            const brandBalance: BrandBalance = {
              brand: 'SHARED', // Mark credit cards as shared
              brandName: 'Shared',
              accountName: balance.accountName,
              accountType: balance.accountType,
              balance: balance.balance,
              currency: balance.currency,
            };

            seenCreditCards.set(key, brandBalance);
            allBalances.push(brandBalance);
          } else {
            // Bank accounts are brand-specific
            allBalances.push({
              brand: brandCode,
              brandName: brandName,
              accountName: balance.accountName,
              accountType: balance.accountType,
              balance: balance.balance,
              currency: balance.currency,
            });
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error fetching balances for ${conn.tenant_name}:`, errorMsg);
        errors.push(`${conn.tenant_name}: ${errorMsg}`);
      }
    }

    // Calculate totals
    const totalCash = allBalances
      .filter(b => b.accountType === 'BANK')
      .reduce((sum, b) => sum + b.balance, 0);

    const totalCredit = allBalances
      .filter(b => b.accountType === 'CREDITCARD')
      .reduce((sum, b) => sum + b.balance, 0);

    // Sort: Bank accounts first (sorted by brand), then credit cards
    allBalances.sort((a, b) => {
      if (a.accountType !== b.accountType) {
        return a.accountType === 'BANK' ? -1 : 1;
      }
      return a.brand.localeCompare(b.brand);
    });

    return NextResponse.json({
      success: true,
      balances: allBalances,
      totals: {
        totalCash,
        totalCredit,
        netPosition: totalCash + totalCredit, // Credit is usually negative
      },
      lastUpdated: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Error in balances endpoint:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
