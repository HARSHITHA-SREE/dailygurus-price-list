import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { parseWhatsAppPriceList } from '@/lib/whatsapp-parser';
import { catalog } from '@/lib/data';
import { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, customCatalog } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Price list text is required' },
        { status: 400 }
      );
    }

    let targetCatalog: Product[] = customCatalog;

    if (!targetCatalog || !Array.isArray(targetCatalog) || targetCatalog.length === 0) {
      targetCatalog = catalog.products.map(p => ({
        id: p.numericId,
        category_id: p.category_id,
        subcategory_id: p.subcategory_id,
        name: p.name,
        tamil_name: p.tamil_name,
        image_url: p.image_url,
        icon: p.icon,
        default_unit: p.default_unit,
        display_order: p.display_order,
        active: p.active,
      }));
    }

    const parseResult = parseWhatsAppPriceList(text, targetCatalog);

    return NextResponse.json({
      success: true,
      result: parseResult,
    });
  } catch (error: any) {
    console.error('Import parse error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse text' },
      { status: 500 }
    );
  }
}
