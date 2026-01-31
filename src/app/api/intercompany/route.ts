import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { InterCompanyTransaction, InterCompanyCategory } from '@/types';

// GET: List inter-company transactions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const status = searchParams.get('status'); // pending, approved, voided, all
    const fromBrandId = searchParams.get('from_brand_id');
    const toBrandId = searchParams.get('to_brand_id');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify authentication
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from('inter_company_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    // Apply filters
    if (fromDate) {
      query = query.gte('transaction_date', fromDate);
    }
    if (toDate) {
      query = query.lte('transaction_date', toDate);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (fromBrandId) {
      query = query.eq('from_brand_id', fromBrandId);
    }
    if (toBrandId) {
      query = query.eq('to_brand_id', toBrandId);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Get brands for display
    const { data: brands } = await supabase.from('brands').select('id, name, code');
    const brandMap = new Map(brands?.map(b => [b.id, b]) || []);

    // Enrich transactions with brand info
    const enrichedTransactions = (transactions || []).map(tx => ({
      ...tx,
      from_brand: brandMap.get(tx.from_brand_id),
      to_brand: brandMap.get(tx.to_brand_id),
    }));

    // Calculate summary stats
    const approvedTransactions = enrichedTransactions.filter(t => t.status === 'approved');
    const pendingTransactions = enrichedTransactions.filter(t => t.status === 'pending');

    const summary = {
      total: enrichedTransactions.length,
      pending: pendingTransactions.length,
      approved: approvedTransactions.length,
      voided: enrichedTransactions.filter(t => t.status === 'voided').length,
      totalApprovedValue: approvedTransactions.reduce((sum, t) => sum + Number(t.subtotal), 0),
      totalPendingValue: pendingTransactions.reduce((sum, t) => sum + Number(t.subtotal), 0),
    };

    return NextResponse.json({
      transactions: enrichedTransactions,
      brands: brands || [],
      summary,
    });
  } catch (error) {
    console.error('Error fetching IC transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Create new inter-company transaction
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify authentication and admin role
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      from_brand_id,
      to_brand_id,
      transaction_date,
      description,
      category,
      subtotal,
      tax = 0,
      pricing_notes,
      notes,
    } = body as {
      from_brand_id: string;
      to_brand_id: string;
      transaction_date: string;
      description: string;
      category: InterCompanyCategory;
      subtotal: number;
      tax?: number;
      pricing_notes?: string;
      notes?: string;
    };

    // Validate required fields
    if (!from_brand_id || !to_brand_id || !transaction_date || !description || !category || !subtotal) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate brands are different
    if (from_brand_id === to_brand_id) {
      return NextResponse.json(
        { error: 'From and To brands must be different' },
        { status: 400 }
      );
    }

    // Calculate total
    const total = subtotal + (tax || 0);

    // Insert transaction
    const { data: transaction, error: insertError } = await supabase
      .from('inter_company_transactions')
      .insert({
        from_brand_id,
        to_brand_id,
        transaction_date,
        description,
        category,
        subtotal,
        tax: tax || 0,
        total,
        pricing_notes: pricing_notes || null,
        notes: notes || null,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Inter-company transaction created',
    });
  } catch (error) {
    console.error('Error creating IC transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH: Update transaction (approve, void, or edit)
export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify authentication and admin role
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action, ...updateFields } = body as {
      id: string;
      action?: 'approve' | 'void' | 'reopen';
      [key: string]: unknown;
    };

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    let updatePayload: Record<string, unknown> = {};

    if (action === 'approve') {
      updatePayload = {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      };
    } else if (action === 'void') {
      updatePayload = {
        status: 'voided',
      };
    } else if (action === 'reopen') {
      updatePayload = {
        status: 'pending',
        approved_at: null,
        approved_by: null,
      };
    } else {
      // Regular update (edit fields)
      const allowedFields = [
        'from_brand_id',
        'to_brand_id',
        'transaction_date',
        'description',
        'category',
        'subtotal',
        'tax',
        'pricing_notes',
        'notes',
      ];

      for (const field of allowedFields) {
        if (field in updateFields) {
          updatePayload[field] = updateFields[field];
        }
      }

      // Recalculate total if subtotal or tax changed
      if ('subtotal' in updatePayload || 'tax' in updatePayload) {
        const { data: existing } = await supabase
          .from('inter_company_transactions')
          .select('subtotal, tax')
          .eq('id', id)
          .single();

        const newSubtotal = (updatePayload.subtotal as number) ?? existing?.subtotal ?? 0;
        const newTax = (updatePayload.tax as number) ?? existing?.tax ?? 0;
        updatePayload.total = newSubtotal + newTax;
      }
    }

    const { data: transaction, error: updateError } = await supabase
      .from('inter_company_transactions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      transaction,
      message: action ? `Transaction ${action}ed` : 'Transaction updated',
    });
  } catch (error) {
    console.error('Error updating IC transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a pending transaction
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify authentication and admin role
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Only allow deleting pending transactions
    const { data: transaction } = await supabase
      .from('inter_company_transactions')
      .select('status')
      .eq('id', id)
      .single();

    if (transaction?.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending transactions' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('inter_company_transactions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted',
    });
  } catch (error) {
    console.error('Error deleting IC transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
