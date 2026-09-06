import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, tamil_name, default_unit, category_id, subcategory_id')
      .eq('active', 1)
      .order('category_id', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Also fetch subcategory names for grouping in the dropdown
    const { data: subcategories } = await supabaseAdmin
      .from('subcategories')
      .select('id, name, category_id')
      .eq('active', 1)
      .order('display_order', { ascending: true });

    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, name, category_type')
      .eq('active', 1)
      .order('display_order', { ascending: true });

    return NextResponse.json({
      success: true,
      products: products || [],
      subcategories: subcategories || [],
      categories: categories || [],
    });
  } catch (error: any) {
    console.error('Error fetching products for trend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
