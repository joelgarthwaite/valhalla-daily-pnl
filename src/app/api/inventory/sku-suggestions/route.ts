import { NextRequest, NextResponse } from 'next/server';
import { generateAllSuggestions, type SkuData } from '@/lib/inventory/sku-matcher';

/**
 * POST /api/inventory/sku-suggestions
 *
 * Generate mapping suggestions for SKUs.
 * Called manually via button click (not auto-loaded) to avoid performance issues.
 *
 * Body: { skus: SkuData[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const skus: SkuData[] = body.skus || [];

    if (!Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json(
        { error: 'No SKUs provided' },
        { status: 400 }
      );
    }

    // Generate suggestions
    const suggestions = generateAllSuggestions(skus);

    // Group by confidence
    const highConfidence = suggestions.filter(s => s.confidence === 'high');
    const mediumConfidence = suggestions.filter(s => s.confidence === 'medium');
    const lowConfidence = suggestions.filter(s => s.confidence === 'low');

    return NextResponse.json({
      success: true,
      count: suggestions.length,
      suggestions,
      summary: {
        high: highConfidence.length,
        medium: mediumConfidence.length,
        low: lowConfidence.length,
      },
    });
  } catch (error) {
    console.error('Suggestion generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
