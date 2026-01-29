import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SkuMapping {
  id: string;
  old_sku: string;
  current_sku: string;
  brand_id: string | null;
  platform: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * GET - List all SKU mappings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    let query = supabase
      .from('sku_mapping')
      .select('*')
      .order('created_at', { ascending: false });

    if (platform && platform !== 'all') {
      query = query.or(`platform.eq.${platform},platform.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching SKU mappings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      mappings: data || [],
    });
  } catch (error) {
    console.error('SKU mapping fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SKU mappings' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new SKU mapping
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldSku, currentSku, platform, notes } = body;

    if (!oldSku || !currentSku) {
      return NextResponse.json(
        { error: 'oldSku and currentSku are required' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('sku_mapping')
      .select('id')
      .eq('old_sku', oldSku.toUpperCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Mapping already exists for this SKU' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('sku_mapping')
      .insert({
        old_sku: oldSku.toUpperCase().trim(),
        current_sku: currentSku.toUpperCase().trim(),
        platform: platform || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating SKU mapping:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mapping: data,
    });
  } catch (error) {
    console.error('SKU mapping create error:', error);
    return NextResponse.json(
      { error: 'Failed to create SKU mapping' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a SKU mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const oldSku = searchParams.get('oldSku');

    if (!id && !oldSku) {
      return NextResponse.json(
        { error: 'Either id or oldSku is required' },
        { status: 400 }
      );
    }

    let query = supabase.from('sku_mapping').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (oldSku) {
      query = query.eq('old_sku', oldSku.toUpperCase().trim());
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting SKU mapping:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Mapping deleted',
    });
  } catch (error) {
    console.error('SKU mapping delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete SKU mapping' },
      { status: 500 }
    );
  }
}
