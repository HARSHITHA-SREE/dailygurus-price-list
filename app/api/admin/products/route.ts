import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { catalog } from '@/lib/data';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      products: catalog.products.map(p => ({
        id: p.numericId,
        slug: p.id,
        name: p.name,
        tamil_name: p.tamil_name,
        category_id: p.category_id,
        subcategory_id: p.subcategory_id,
        default_unit: p.default_unit,
        display_order: p.display_order,
        active: p.active,
        icon: p.icon,
        image_url: p.image_url,
      })),
      categories: catalog.categories,
      subcategories: catalog.subcategories,
    });
  } catch (error: any) {
    console.error('Static products GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, product } = body;

    // In static architecture, catalog updates modify data/catalog.json on disk if filesystem is writable
    const catalogPath = path.join(process.cwd(), 'data', 'catalog.json');
    let diskCatalog = { ...catalog };
    if (fs.existsSync(catalogPath)) {
      diskCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }

    if (action === 'toggle') {
      const { id, active } = body;
      const target = diskCatalog.products.find((p: any) => p.numericId === Number(id) || p.id === String(id));
      if (target) {
        target.active = active ? 1 : 0;
        try {
          fs.writeFileSync(catalogPath, JSON.stringify(diskCatalog, null, 2), 'utf8');
        } catch (e) {
          // Vercel serverless read-only filesystem
        }
      }
      return NextResponse.json({
        success: true,
        message: `Product ${active ? 'activated' : 'deactivated'} successfully`,
        product: target,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Product catalog is managed via data/catalog.json in static mode.',
    });
  } catch (error: any) {
    console.error('Products POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save product' },
      { status: 500 }
    );
  }
}
