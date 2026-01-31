import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BulkMappingEntry {
  brand: string;
  legacy_sku: string;
  proposed_new_sku: string;
  status: string;
  platforms: string;
  notes?: string;
}

/**
 * POST - Bulk import SKU mappings
 * Used for initial import from the SKU audit CSV
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mappings, dryRun = false } = body as { mappings: BulkMappingEntry[]; dryRun?: boolean };

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'mappings array is required' },
        { status: 400 }
      );
    }

    // Get brand IDs
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, code');

    if (brandsError) {
      return NextResponse.json(
        { error: 'Failed to fetch brands: ' + brandsError.message },
        { status: 500 }
      );
    }

    const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);

    // Filter to only AUTO_MAPPED entries with valid mappings
    const validMappings = mappings.filter(m =>
      m.status === 'AUTO_MAPPED' &&
      m.legacy_sku &&
      m.proposed_new_sku &&
      m.legacy_sku !== m.proposed_new_sku
    );

    // Check for existing mappings to avoid duplicates
    const { data: existingMappings } = await supabase
      .from('sku_mapping')
      .select('old_sku');

    const existingSkus = new Set(existingMappings?.map(m => m.old_sku.toUpperCase()) || []);

    // Prepare insert data
    const toInsert = validMappings
      .filter(m => !existingSkus.has(m.legacy_sku.toUpperCase().trim()))
      .map(m => ({
        old_sku: m.legacy_sku.toUpperCase().trim(),
        current_sku: m.proposed_new_sku.toUpperCase().trim(),
        brand_id: brandMap.get(m.brand) || null,
        platform: null, // Apply to all platforms
        notes: m.notes || `Imported from SKU audit - ${m.brand}`,
      }));

    const skipped = validMappings.length - toInsert.length;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        summary: {
          totalInFile: mappings.length,
          validMappings: validMappings.length,
          toInsert: toInsert.length,
          skippedExisting: skipped,
        },
        preview: toInsert.slice(0, 10),
      });
    }

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from('sku_mapping')
        .insert(batch);

      if (error) {
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      summary: {
        totalInFile: mappings.length,
        validMappings: validMappings.length,
        inserted,
        skippedExisting: skipped,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk SKU mapping import error:', error);
    return NextResponse.json(
      { error: 'Failed to import SKU mappings' },
      { status: 500 }
    );
  }
}
