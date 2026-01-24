import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEventsForYear } from '@/lib/calendar/standard-events';

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
    const body = await request.json();
    const { year, countries = ['UK', 'US'], replaceExisting = false } = body;

    if (!year || typeof year !== 'number') {
      return NextResponse.json(
        { error: 'Year is required and must be a number' },
        { status: 400 }
      );
    }

    // Generate events for the year
    const events = generateEventsForYear(year, countries);

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'No events to import for the specified criteria' },
        { status: 400 }
      );
    }

    // If replaceExisting, delete existing standard events for the year
    if (replaceExisting) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      await supabase
        .from('calendar_events')
        .delete()
        .eq('is_recurring', true)
        .gte('date', yearStart)
        .lte('date', yearEnd);
    }

    // Prepare events for insertion (with country column)
    const eventsWithCountry = events.map((event) => ({
      brand_id: null, // Applies to all brands
      date: event.date,
      title: event.title,
      category: event.category,
      description: event.description,
      is_recurring: event.is_recurring,
      color: event.color,
      country: event.country,
    }));

    // Try to insert with country column first
    let { data, error } = await supabase
      .from('calendar_events')
      .insert(eventsWithCountry as never)
      .select();

    // If country column doesn't exist, retry without it
    if (error && error.code === 'PGRST204' && error.message.includes('country')) {
      console.log('Country column not found, inserting without country field');
      const eventsWithoutCountry = events.map((event) => ({
        brand_id: null,
        date: event.date,
        title: event.title,
        category: event.category,
        description: event.description ? `${event.description} (${event.country || 'Global'})` : (event.country || null),
        is_recurring: event.is_recurring,
        color: event.color,
      }));

      const result = await supabase
        .from('calendar_events')
        .insert(eventsWithoutCountry as never)
        .select();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error inserting events:', error);
      throw error;
    }

    const insertedEvents = data || [];

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedEvents.length} events for ${year}`,
      count: insertedEvents.length,
      events: insertedEvents,
    });
  } catch (error) {
    console.error('Error seeding calendar events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to seed calendar events',
    example: {
      year: 2025,
      countries: ['UK', 'US'],
      replaceExisting: false,
    },
  });
}
