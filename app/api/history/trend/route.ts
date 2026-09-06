import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parsePriceForGraph } from '@/lib/price-parser';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
        { status: 400 }
      );
    }

    // Fetch product info
    const { data: product, error: prodError } = await supabaseAdmin
      .from('products')
      .select('id, name, tamil_name, default_unit, icon, image_url')
      .eq('id', parseInt(productId, 10))
      .single();

    if (prodError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Build query for daily prices — only for published dates
    let query = supabaseAdmin
      .from('daily_prices')
      .select('price_date, price, unit, price_notes')
      .eq('product_id', parseInt(productId, 10))
      .order('price_date', { ascending: true });

    if (fromDate) {
      query = query.gte('price_date', fromDate);
    }
    if (toDate) {
      query = query.lte('price_date', toDate);
    }

    const { data: pricesData, error: pricesError } = await query;

    if (pricesError) throw pricesError;

    // Filter to only published dates
    const { data: publishedDates } = await supabaseAdmin
      .from('price_dates')
      .select('price_date')
      .eq('is_published', 1);

    const publishedSet = new Set((publishedDates || []).map(d => d.price_date));

    // Parse each price and build trend data
    const data = (pricesData || [])
      .filter(row => publishedSet.has(row.price_date))
      .map(row => {
        const parsed = parsePriceForGraph(row.price, row.unit || product.default_unit);
        return {
          date: row.price_date,
          raw: row.price || '',
          type: parsed.type,
          min: parsed.min,
          max: parsed.max,
          unit: parsed.unit || row.unit || product.default_unit,
        };
      });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        tamil_name: product.tamil_name,
        default_unit: product.default_unit,
      },
      data,
    });
  } catch (error: any) {
    console.error('Error fetching trend data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}
