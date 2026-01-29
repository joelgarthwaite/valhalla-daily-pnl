import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  refreshXeroToken,
  fetchInvoices,
  parseXeroDate,
  type XeroInvoice,
} from '@/lib/xero/client';

/**
 * GET /api/xero/invoices
 *
 * List synced Xero invoices from database with filtering
 *
 * Query params:
 *   status: 'pending' | 'approved' | 'ignored' | 'all' (default: 'all')
 *   brand: 'all' | 'DC' | 'BI' (default: 'all')
 *   limit: number (default: 50)
 *   offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const brandFilter = searchParams.get('brand') || 'all';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get brand IDs for filtering
    const { data: brands } = await supabase.from('brands').select('id, code, name');
    const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);
    const brandNameMap = new Map(brands?.map(b => [b.id, { code: b.code, name: b.name }]) || []);

    // Build query
    let query = supabase
      .from('xero_invoices')
      .select('*', { count: 'exact' })
      .order('invoice_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status
    if (status !== 'all') {
      query = query.eq('approval_status', status);
    }

    // Filter by brand
    if (brandFilter !== 'all') {
      const brandId = brandMap.get(brandFilter);
      if (brandId) {
        query = query.eq('brand_id', brandId);
      }
    }

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get linked order info for approved invoices (tracking numbers)
    const approvedInvoiceIds = (invoices || [])
      .filter(inv => inv.matched_order_id)
      .map(inv => inv.matched_order_id);

    let orderTrackingMap = new Map<string, string>();
    if (approvedInvoiceIds.length > 0) {
      const { data: linkedOrders } = await supabase
        .from('orders')
        .select('id, raw_data')
        .in('id', approvedInvoiceIds);

      if (linkedOrders) {
        for (const order of linkedOrders) {
          const trackingNumber = order.raw_data?.tracking_number;
          if (trackingNumber) {
            orderTrackingMap.set(order.id, trackingNumber);
          }
        }
      }
    }

    // Add brand info and tracking to each invoice
    const invoicesWithBrand = (invoices || []).map(inv => ({
      ...inv,
      brand: brandNameMap.get(inv.brand_id),
      linked_tracking: inv.matched_order_id ? orderTrackingMap.get(inv.matched_order_id) || null : null,
    }));

    // Get status counts for summary
    const { data: pendingCount } = await supabase
      .from('xero_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending');

    const { data: approvedCount } = await supabase
      .from('xero_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'approved');

    const { data: ignoredCount } = await supabase
      .from('xero_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'ignored');

    // Get approved value this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: approvedThisMonth } = await supabase
      .from('xero_invoices')
      .select('subtotal')
      .eq('approval_status', 'approved')
      .gte('approved_at', startOfMonth.toISOString());

    const approvedValue = (approvedThisMonth || []).reduce(
      (sum, inv) => sum + (inv.subtotal || 0),
      0
    );

    return NextResponse.json({
      invoices: invoicesWithBrand,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
      statusCounts: {
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        ignored: ignoredCount || 0,
      },
      approvedThisMonth: {
        count: approvedThisMonth?.length || 0,
        value: approvedValue,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/xero/invoices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xero/invoices
 *
 * Sync invoices from Xero into the database
 *
 * Body:
 *   brandCode: 'DC' | 'BI' (required)
 *   fromDate?: string (YYYY-MM-DD)
 *   toDate?: string (YYYY-MM-DD)
 *   status?: 'PAID' | 'AUTHORISED' | 'ALL' (default: 'PAID')
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { brandCode, fromDate, toDate, status: invoiceStatus = 'PAID', skipDateFilter = false } = body;

    if (!brandCode) {
      return NextResponse.json(
        { error: 'brandCode is required' },
        { status: 400 }
      );
    }

    // Validate status parameter
    const validStatuses = ['PAID', 'AUTHORISED', 'ALL'];
    if (!validStatuses.includes(invoiceStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Get brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, code, name')
      .eq('code', brandCode)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: `Brand not found: ${brandCode}` },
        { status: 404 }
      );
    }

    // Get Xero connection for this brand
    const { data: connection, error: connError } = await supabase
      .from('xero_connections')
      .select('*')
      .eq('brand_id', brand.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: `No Xero connection for ${brand.name}. Connect Xero first.` },
        { status: 400 }
      );
    }

    // Check and refresh token if needed
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    let accessToken = connection.access_token;

    if (expiresAt.getTime() - now.getTime() < bufferMs) {
      console.log(`Refreshing Xero token for ${brand.name}`);
      const newTokens = await refreshXeroToken(
        clientId,
        clientSecret,
        connection.refresh_token
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
        .eq('id', connection.id);
    }

    // Fetch invoices from Xero
    console.log(`Fetching ${invoiceStatus} invoices from Xero for ${brand.name}`, {
      fromDate,
      toDate,
      skipDateFilter,
      tenantId: connection.tenant_id,
    });

    const invoices = await fetchInvoices(accessToken, connection.tenant_id, {
      status: invoiceStatus === 'ALL' ? undefined : invoiceStatus as 'PAID' | 'AUTHORISED',
      fromDate,
      toDate,
      skipDateFilter,
    });

    console.log(`Received ${invoices.length} invoices from Xero`);

    // Transform and upsert invoices
    const syncedAt = new Date().toISOString();
    let newCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    for (const inv of invoices) {
      try {
        const invoiceDate = parseXeroDate(inv.Date);
        const dueDate = inv.DueDate ? parseXeroDate(inv.DueDate) : null;

        const record = {
          brand_id: brand.id,
          xero_invoice_id: inv.InvoiceID,
          invoice_number: inv.InvoiceNumber,
          contact_name: inv.Contact.Name,
          contact_email: inv.Contact.EmailAddress || null,
          invoice_date: invoiceDate,
          due_date: dueDate,
          subtotal: inv.SubTotal,
          tax_total: inv.TotalTax,
          total: inv.Total,
          currency: inv.CurrencyCode,
          xero_status: inv.Status,
          line_items: inv.LineItems || [],
          contact_data: inv.Contact,
          synced_at: syncedAt,
        };

        // Try to insert, or update if exists (based on unique constraint)
        const { error: upsertError } = await supabase
          .from('xero_invoices')
          .upsert(record, {
            onConflict: 'brand_id,xero_invoice_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          // Check if it's a duplicate (already exists)
          if (upsertError.code === '23505') {
            existingCount++;
          } else {
            console.error('Error upserting invoice:', upsertError);
            errorCount++;
          }
        } else {
          // Check if it was an insert or update
          const { data: existing } = await supabase
            .from('xero_invoices')
            .select('created_at, synced_at')
            .eq('xero_invoice_id', inv.InvoiceID)
            .eq('brand_id', brand.id)
            .single();

          if (existing && existing.created_at === existing.synced_at) {
            newCount++;
          } else {
            existingCount++;
          }
        }
      } catch (err) {
        console.error('Error processing invoice:', inv.InvoiceNumber, err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${invoices.length} invoices from Xero`,
      results: {
        total: invoices.length,
        new: newCount,
        existing: existingCount,
        errors: errorCount,
      },
      brand: brand.name,
      dateRange: { from: fromDate || 'all time', to: toDate || 'now' },
    });
  } catch (error) {
    console.error('Error in POST /api/xero/invoices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
