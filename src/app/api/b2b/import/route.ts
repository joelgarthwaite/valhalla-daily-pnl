import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setWeek, startOfWeek, format } from 'date-fns';
import type { B2BImportEntry } from '@/types';

interface ImportRequestBody {
  brand_code: string; // 'DC' or 'BI'
  entries: B2BImportEntry[];
  customer_name?: string; // Default: 'Historic B2B Import'
}

/**
 * Calculate the Monday of a specific ISO week
 */
function getWeekMonday(year: number, week: number): Date {
  // Create a date in the middle of January to avoid year boundary issues
  const baseDate = new Date(year, 0, 10);
  // Set to the target week
  const weekDate = setWeek(baseDate, week, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  // Get Monday of that week
  return startOfWeek(weekDate, { weekStartsOn: 1 });
}

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: ImportRequestBody = await request.json();
    const { brand_code, entries, customer_name = 'Historic B2B Import' } = body;

    if (!brand_code) {
      return NextResponse.json(
        { error: 'brand_code is required (DC or BI)' },
        { status: 400 }
      );
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'entries array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate entries
    for (const entry of entries) {
      if (!entry.year || !entry.week || entry.subtotal === undefined) {
        return NextResponse.json(
          { error: 'Each entry must have year, week, and subtotal' },
          { status: 400 }
        );
      }
      if (entry.week < 1 || entry.week > 53) {
        return NextResponse.json(
          { error: `Invalid week number: ${entry.week}. Must be 1-53.` },
          { status: 400 }
        );
      }
    }

    // Get brand ID from brand_code
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('code', brand_code)
      .single();

    if (brandError || !brandData) {
      return NextResponse.json(
        { error: `Brand not found with code: ${brand_code}` },
        { status: 404 }
      );
    }

    const brandId = brandData.id;

    // Prepare B2B revenue entries
    const b2bEntries = entries.map((entry) => {
      const monday = getWeekMonday(entry.year, entry.week);
      const dateStr = format(monday, 'yyyy-MM-dd');

      return {
        brand_id: brandId,
        date: dateStr,
        customer_name: customer_name,
        invoice_number: `B2B-${entry.year}-W${entry.week.toString().padStart(2, '0')}`,
        subtotal: entry.subtotal,
        shipping_charged: 0,
        tax: 0,
        total: entry.subtotal, // B2B data is net of shipping, so subtotal = total
        payment_method: 'bank_transfer',
        notes: entry.notes || `Week ${entry.week} (${entry.year}) B2B sales`,
      };
    });

    // Check for existing entries to avoid duplicates
    const existingInvoices = b2bEntries.map((e) => e.invoice_number);
    const { data: existing } = await supabase
      .from('b2b_revenue')
      .select('invoice_number')
      .in('invoice_number', existingInvoices);

    const existingSet = new Set(existing?.map((e) => e.invoice_number) || []);
    const newEntries = b2bEntries.filter((e) => !existingSet.has(e.invoice_number));

    if (newEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All entries already exist, no new entries imported',
        count: 0,
        skipped: b2bEntries.length,
        total: entries.reduce((sum, e) => sum + e.subtotal, 0),
      });
    }

    // Insert new entries
    const { data: insertedData, error: insertError } = await supabase
      .from('b2b_revenue')
      .insert(newEntries as never)
      .select();

    if (insertError) {
      console.error('Error inserting B2B entries:', insertError);
      throw insertError;
    }

    const insertedEntries = insertedData || [];
    const totalImported = newEntries.reduce((sum, e) => sum + e.subtotal, 0);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedEntries.length} B2B revenue entries`,
      count: insertedEntries.length,
      skipped: b2bEntries.length - newEntries.length,
      total: totalImported,
      entries: insertedEntries.map((e) => ({
        date: e.date,
        invoice_number: e.invoice_number,
        subtotal: e.subtotal,
      })),
    });
  } catch (error) {
    console.error('Error importing B2B revenue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to import B2B revenue data',
    example: {
      brand_code: 'DC',
      customer_name: 'Historic B2B Import',
      entries: [
        { year: 2025, week: 15, subtotal: 630, notes: 'Week 15 B2B sales' },
        { year: 2025, week: 16, subtotal: 1614, notes: 'Week 16 B2B sales' },
      ],
    },
    notes: {
      brand_code: 'Use DC for Display Champ, BI for Bright Ivy',
      week: 'ISO week number (1-52/53)',
      subtotal: 'Net revenue (excluding shipping)',
      customer_name: 'Optional, defaults to "Historic B2B Import"',
    },
  });
}
