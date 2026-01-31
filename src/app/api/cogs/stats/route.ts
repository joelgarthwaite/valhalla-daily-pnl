import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCOGSStatistics } from '@/lib/pnl/actual-cogs';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify the user is authenticated
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get COGS statistics
    const stats = await getCOGSStatistics(supabase);

    // Also get some additional context
    const [
      { count: totalProducts },
      { count: totalComponents },
      { count: totalBOMEntries },
    ] = await Promise.all([
      supabase.from('product_skus').select('*', { count: 'exact', head: true }),
      supabase.from('components').select('*', { count: 'exact', head: true }),
      supabase.from('bom').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        totalProducts: totalProducts || 0,
        totalComponents: totalComponents || 0,
        totalBOMEntries: totalBOMEntries || 0,
      },
      readinessStatus: stats.hasData
        ? (stats.componentsWithoutCosts === 0 ? 'ready' : 'partial')
        : 'not_ready',
      recommendations: generateRecommendations(stats, totalProducts || 0),
    });
  } catch (error) {
    console.error('COGS stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(stats: Awaited<ReturnType<typeof getCOGSStatistics>>, totalProducts: number): string[] {
  const recommendations: string[] = [];

  if (stats.componentsWithCosts === 0) {
    recommendations.push('Add component costs: No components have supplier pricing. Go to Inventory > Components and add unit costs.');
  } else if (stats.componentsWithoutCosts > 0) {
    recommendations.push(`Complete component costs: ${stats.componentsWithoutCosts} components are missing unit costs.`);
  }

  if (stats.productsWithBOM === 0) {
    recommendations.push('Define BOMs: No product SKUs have bill of materials defined. Go to Inventory > BOM Editor to link products to components.');
  } else if (totalProducts > 0 && stats.productsWithBOM < totalProducts * 0.8) {
    recommendations.push(`Expand BOM coverage: Only ${stats.productsWithBOM} of ${totalProducts} products have BOMs defined.`);
  }

  if (stats.skuMappingsCount === 0) {
    recommendations.push('Consider adding SKU mappings if you have legacy SKUs that need to map to current B-series SKUs.');
  }

  if (recommendations.length === 0) {
    recommendations.push('COGS data is complete! Actual costs will be used in P&L calculations.');
  }

  return recommendations;
}
