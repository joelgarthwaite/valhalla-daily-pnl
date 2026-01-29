import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Types for reconciliation
interface B2BOrder {
  id: string;
  brand_id: string;
  order_number: string | null;
  order_date: string;
  customer_name: string | null;
  b2b_customer_name: string | null;
  subtotal: number;
  total: number;
  currency: string;
  raw_data: Record<string, unknown> | null;
  brand?: { code: string; name: string };
}

interface XeroInvoice {
  id: string;
  brand_id: string;
  xero_invoice_id: string;
  invoice_number: string;
  contact_name: string;
  invoice_date: string | null;
  subtotal: number;
  total: number;
  currency: string;
  approval_status: string;
  matched_order_id: string | null;
  brand?: { code: string; name: string };
}

interface MatchSuggestion {
  order: B2BOrder;
  invoice: XeroInvoice;
  confidence: number;
  matchReasons: string[];
}

/**
 * Calculate confidence score for a potential match between B2B order and Xero invoice
 */
function calculateMatchConfidence(order: B2BOrder, invoice: XeroInvoice): { confidence: number; reasons: string[] } {
  let confidence = 0;
  const reasons: string[] = [];

  // Amount matching (most important - up to 60 points)
  const orderAmount = Math.round(order.subtotal * 100) / 100;
  const invoiceAmount = Math.round(invoice.subtotal * 100) / 100;
  const amountDiff = Math.abs(orderAmount - invoiceAmount);
  const amountPercent = orderAmount > 0 ? (amountDiff / orderAmount) * 100 : 100;

  if (amountDiff === 0) {
    confidence += 60;
    reasons.push('Exact amount match');
  } else if (amountPercent <= 1) {
    confidence += 50;
    reasons.push(`Amount within 1% (£${amountDiff.toFixed(2)} difference)`);
  } else if (amountPercent <= 5) {
    confidence += 30;
    reasons.push(`Amount within 5% (£${amountDiff.toFixed(2)} difference)`);
  } else if (amountPercent <= 10) {
    confidence += 15;
    reasons.push(`Amount within 10% (£${amountDiff.toFixed(2)} difference)`);
  }

  // Date proximity (up to 25 points)
  if (order.order_date && invoice.invoice_date) {
    const orderDate = new Date(order.order_date);
    const invoiceDate = new Date(invoice.invoice_date);
    const daysDiff = Math.abs(Math.floor((orderDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysDiff === 0) {
      confidence += 25;
      reasons.push('Same date');
    } else if (daysDiff <= 3) {
      confidence += 20;
      reasons.push(`${daysDiff} day(s) apart`);
    } else if (daysDiff <= 7) {
      confidence += 15;
      reasons.push(`${daysDiff} days apart`);
    } else if (daysDiff <= 14) {
      confidence += 10;
      reasons.push(`${daysDiff} days apart`);
    } else if (daysDiff <= 30) {
      confidence += 5;
      reasons.push(`${daysDiff} days apart`);
    }
  }

  // Customer name matching (up to 15 points)
  const orderCustomer = (order.b2b_customer_name || order.customer_name || '').toLowerCase().trim();
  const invoiceCustomer = (invoice.contact_name || '').toLowerCase().trim();

  if (orderCustomer && invoiceCustomer) {
    if (orderCustomer === invoiceCustomer) {
      confidence += 15;
      reasons.push('Exact customer name match');
    } else if (orderCustomer.includes(invoiceCustomer) || invoiceCustomer.includes(orderCustomer)) {
      confidence += 10;
      reasons.push('Partial customer name match');
    } else {
      // Check for word overlap
      const orderWords = orderCustomer.split(/\s+/).filter(w => w.length > 2);
      const invoiceWords = invoiceCustomer.split(/\s+/).filter(w => w.length > 2);
      const commonWords = orderWords.filter(w => invoiceWords.some(iw => iw.includes(w) || w.includes(iw)));

      if (commonWords.length > 0) {
        confidence += 5;
        reasons.push(`Customer name contains: ${commonWords.join(', ')}`);
      }
    }
  }

  // Brand match (must match)
  if (order.brand_id !== invoice.brand_id) {
    // Reduce confidence significantly for different brands
    confidence = Math.max(0, confidence - 40);
    reasons.push('Different brand (warning)');
  }

  return { confidence, reasons };
}

/**
 * GET /api/xero/invoices/reconcile
 *
 * Get unreconciled B2B orders and potential Xero invoice matches
 *
 * Query params:
 *   brand: 'all' | 'DC' | 'BI' - Filter by brand
 *   minConfidence: number - Minimum confidence score (0-100, default 40)
 */
export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const searchParams = request.nextUrl.searchParams;
  const brandFilter = searchParams.get('brand') || 'all';
  const minConfidence = parseInt(searchParams.get('minConfidence') || '40', 10);

  try {
    // Get brands for filtering
    const { data: brands } = await supabase.from('brands').select('id, code, name');
    const brandMap = new Map(brands?.map(b => [b.id, b]) || []);
    const brandCodeToId = new Map(brands?.map(b => [b.code, b.id]) || []);

    // Build brand filter
    let brandIds: string[] = [];
    if (brandFilter !== 'all') {
      const brandId = brandCodeToId.get(brandFilter);
      if (brandId) {
        brandIds = [brandId];
      }
    }

    // Get unreconciled B2B orders (orders that don't have xero_invoice_id in raw_data)
    let ordersQuery = supabase
      .from('orders')
      .select('id, brand_id, order_number, order_date, customer_name, b2b_customer_name, subtotal, total, currency, raw_data')
      .eq('is_b2b', true)
      .is('excluded_at', null)
      .order('order_date', { ascending: false });

    if (brandIds.length > 0) {
      ordersQuery = ordersQuery.in('brand_id', brandIds);
    }

    const { data: allOrders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      throw ordersError;
    }

    // Filter to only unreconciled orders (no xero_invoice_id in raw_data)
    const unreconciledOrders = (allOrders || []).filter(order => {
      const rawData = order.raw_data as Record<string, unknown> | null;
      return !rawData?.xero_invoice_id;
    });

    // Get unmatched Xero invoices (approved ones without a matched_order or any approved/pending)
    let invoicesQuery = supabase
      .from('xero_invoices')
      .select('id, brand_id, xero_invoice_id, invoice_number, contact_name, invoice_date, subtotal, total, currency, approval_status, matched_order_id')
      .eq('xero_status', 'PAID')
      .is('matched_order_id', null) // Not already linked to an order
      .in('approval_status', ['pending', 'approved']); // Include pending and unlinked approved

    if (brandIds.length > 0) {
      invoicesQuery = invoicesQuery.in('brand_id', brandIds);
    }

    const { data: availableInvoices, error: invoicesError } = await invoicesQuery;

    if (invoicesError) {
      throw invoicesError;
    }

    // Add brand info to orders and invoices
    const ordersWithBrand: B2BOrder[] = unreconciledOrders.map(o => ({
      ...o,
      brand: brandMap.get(o.brand_id),
    }));

    const invoicesWithBrand: XeroInvoice[] = (availableInvoices || []).map(i => ({
      ...i,
      brand: brandMap.get(i.brand_id),
    }));

    // Generate match suggestions
    const suggestions: MatchSuggestion[] = [];

    for (const order of ordersWithBrand) {
      for (const invoice of invoicesWithBrand) {
        // Only consider invoices from the same brand
        if (order.brand_id !== invoice.brand_id) continue;

        const { confidence, reasons } = calculateMatchConfidence(order, invoice);

        if (confidence >= minConfidence) {
          suggestions.push({
            order,
            invoice,
            confidence,
            matchReasons: reasons,
          });
        }
      }
    }

    // Sort by confidence (highest first)
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Group by order to get best match per order
    const bestMatchPerOrder = new Map<string, MatchSuggestion>();
    for (const suggestion of suggestions) {
      if (!bestMatchPerOrder.has(suggestion.order.id)) {
        bestMatchPerOrder.set(suggestion.order.id, suggestion);
      }
    }

    // Get summary counts
    const summary = {
      totalUnreconciledOrders: ordersWithBrand.length,
      totalAvailableInvoices: invoicesWithBrand.length,
      matchSuggestionsCount: suggestions.length,
      highConfidenceMatches: suggestions.filter(s => s.confidence >= 80).length,
      mediumConfidenceMatches: suggestions.filter(s => s.confidence >= 50 && s.confidence < 80).length,
      lowConfidenceMatches: suggestions.filter(s => s.confidence < 50).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      unreconciledOrders: ordersWithBrand,
      availableInvoices: invoicesWithBrand,
      suggestions: Array.from(bestMatchPerOrder.values()),
      allSuggestions: suggestions,
    });
  } catch (error) {
    console.error('Error in GET /api/xero/invoices/reconcile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xero/invoices/reconcile
 *
 * Link a B2B order to a Xero invoice (confirm a match)
 *
 * Body:
 *   orderId: string - The B2B order ID
 *   invoiceId: string - The xero_invoices record ID
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const { orderId, invoiceId } = body;

    if (!orderId || !invoiceId) {
      return NextResponse.json(
        { error: 'orderId and invoiceId are required' },
        { status: 400 }
      );
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, brand_id, order_number, raw_data')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('xero_invoices')
      .select('id, brand_id, xero_invoice_id, invoice_number, matched_order_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice is already matched
    if (invoice.matched_order_id && invoice.matched_order_id !== orderId) {
      return NextResponse.json(
        { error: 'Invoice is already linked to another order' },
        { status: 400 }
      );
    }

    // Verify same brand
    if (order.brand_id !== invoice.brand_id) {
      return NextResponse.json(
        { error: 'Order and invoice are from different brands' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update the order with Xero invoice info
    const existingRawData = (order.raw_data as Record<string, unknown>) || {};
    const updatedRawData = {
      ...existingRawData,
      xero_invoice_id: invoice.xero_invoice_id,
      xero_invoice_number: invoice.invoice_number,
      reconciled_at: now,
    };

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        raw_data: updatedRawData,
        // Optionally update order_number to match Xero invoice if currently null
        ...(order.order_number ? {} : { order_number: invoice.invoice_number }),
      })
      .eq('id', orderId);

    if (updateOrderError) {
      throw updateOrderError;
    }

    // Update the xero_invoices record to link it
    const { error: updateInvoiceError } = await supabase
      .from('xero_invoices')
      .update({
        matched_order_id: orderId,
        approval_status: 'approved',
        approved_at: now,
        notes: `Reconciled with existing B2B order ${order.order_number || orderId}`,
      })
      .eq('id', invoiceId);

    if (updateInvoiceError) {
      throw updateInvoiceError;
    }

    return NextResponse.json({
      success: true,
      message: 'Order and invoice linked successfully',
      order: {
        id: orderId,
        order_number: order.order_number,
      },
      invoice: {
        id: invoiceId,
        invoice_number: invoice.invoice_number,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/xero/invoices/reconcile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/xero/invoices/reconcile
 *
 * Unlink a B2B order from a Xero invoice
 *
 * Query params:
 *   orderId: string - The B2B order ID to unlink
 */
export async function DELETE(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const orderId = request.nextUrl.searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json(
      { error: 'orderId is required' },
      { status: 400 }
    );
  }

  try {
    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, raw_data')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const rawData = (order.raw_data as Record<string, unknown>) || {};
    const xeroInvoiceId = rawData.xero_invoice_id as string | undefined;

    // Remove Xero info from order
    const { xero_invoice_id, xero_invoice_number, reconciled_at, ...remainingRawData } = rawData as Record<string, unknown>;

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ raw_data: remainingRawData })
      .eq('id', orderId);

    if (updateOrderError) {
      throw updateOrderError;
    }

    // If we had a linked invoice, unlink it
    if (xeroInvoiceId) {
      const { error: updateInvoiceError } = await supabase
        .from('xero_invoices')
        .update({
          matched_order_id: null,
          approval_status: 'pending',
          approved_at: null,
          notes: null,
        })
        .eq('xero_invoice_id', xeroInvoiceId);

      if (updateInvoiceError) {
        console.error('Failed to unlink invoice:', updateInvoiceError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Order unlinked from Xero invoice',
    });
  } catch (error) {
    console.error('Error in DELETE /api/xero/invoices/reconcile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
