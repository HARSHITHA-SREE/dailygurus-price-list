import { NextRequest, NextResponse } from 'next/server';
import { catalog, getAvailableDates, getDayPriceData } from '@/lib/data';
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

    // Find product in catalog by numericId or slug id
    const numericId = parseInt(productId, 10);
    const product = catalog.products.find(
      p => (!isNaN(numericId) && p.numericId === numericId) || p.id === productId || String(p.numericId) === productId
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get sorted dates ascending (earliest to latest)
    const allDates = getAvailableDates().sort((a, b) => a.localeCompare(b));
    const filteredDates = allDates.filter(d => {
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    const data = filteredDates.map(dateStr => {
      const dayData = getDayPriceData(dateStr);
      let rawPrice = '';
      let priceUnit = product.default_unit;

      if (dayData?.prices) {
        const pInfo = dayData.prices[product.id] || dayData.prices[String(product.numericId)];
        if (pInfo) {
          rawPrice = typeof pInfo === 'string' ? pInfo : (pInfo.price || '');
          if (typeof pInfo === 'object' && pInfo.unit) {
            priceUnit = pInfo.unit;
          }
        }
      }

      const parsed = parsePriceForGraph(rawPrice, priceUnit);

      return {
        date: dateStr,
        raw: rawPrice,
        type: parsed.type,
        min: parsed.min,
        max: parsed.max,
        unit: parsed.unit || priceUnit,
      };
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.numericId,
        slug: product.id,
        name: product.name,
        tamil_name: product.tamil_name,
        default_unit: product.default_unit,
      },
      data,
    });
  } catch (error: any) {
    console.error('Error generating static trend data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}
