import { NextResponse } from 'next/server';
import { catalog } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = catalog.products
      .filter(p => p.active === 1)
      .map(p => ({
        id: p.numericId,
        slug: p.id,
        name: p.name,
        tamil_name: p.tamil_name,
        default_unit: p.default_unit,
        category_id: p.category_id,
        subcategory_id: p.subcategory_id,
      }));

    const subcategories = catalog.subcategories.map(s => ({
      id: s.id,
      name: s.name,
      category_id: s.category_id,
    }));

    const categories = catalog.categories.map(c => ({
      id: c.id,
      name: c.name,
      category_type: c.category_type,
    }));

    return NextResponse.json({
      success: true,
      products,
      subcategories,
      categories,
    });
  } catch (error: any) {
    console.error('Error fetching static products for trend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
