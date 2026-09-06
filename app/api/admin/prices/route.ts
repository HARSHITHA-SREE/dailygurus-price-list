import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { catalog, getDayPriceData, getAllPublishedDates, getLatestPriceDate } from '@/lib/data';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const latestDate = await getLatestPriceDate();
    const date = searchParams.get('date') || latestDate;
    const copyFromDate = searchParams.get('copy_from_date');

    const lookupDate = copyFromDate || date;
    const dayData = getDayPriceData(lookupDate);

    // Build price map from dayData
    const priceMap = new Map<number | string, { price: string; unit: string; price_notes?: string }>();
    if (dayData?.prices) {
      for (const [key, val] of Object.entries(dayData.prices)) {
        if (typeof val === 'string') {
          priceMap.set(key, { price: val, unit: '' });
        } else if (val && typeof val === 'object') {
          const v = val as any;
          priceMap.set(key, { price: v.price || '', unit: v.unit || '', price_notes: v.notes || v.price_notes || '' });
        }
      }
    }

    // Attach prices to products
    const productPriceList = catalog.products.map(prod => {
      const pInfo = priceMap.get(prod.numericId) || priceMap.get(prod.id) || priceMap.get(String(prod.numericId));
      return {
        id: prod.numericId,
        slug: prod.id,
        category_id: prod.category_id,
        subcategory_id: prod.subcategory_id,
        name: prod.name,
        tamil_name: prod.tamil_name,
        icon: prod.icon,
        image_url: prod.image_url,
        default_unit: prod.default_unit,
        display_order: prod.display_order,
        active: prod.active,
        price: pInfo?.price || '',
        price_unit: pInfo?.unit || prod.default_unit || 'kg',
        price_notes: pInfo?.price_notes || '',
      };
    });

    const recentDates = await getAllPublishedDates();

    return NextResponse.json({
      success: true,
      date,
      copiedFrom: copyFromDate || null,
      priceDateInfo: {
        price_date: date,
        is_published: dayData?.published ? 1 : 0,
        notes: dayData?.notes || '',
      },
      categories: catalog.categories,
      subcategories: catalog.subcategories,
      products: productPriceList,
      recentDates,
    });
  } catch (error: any) {
    console.error('Admin prices GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admin prices' },
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
    const { date, is_published, notes, items } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    // Build static JSON structure for the date
    const priceMapDict: Record<string, { price: string; unit: string; notes: string }> = {};

    (items || []).forEach((item: any) => {
      const prod = catalog.products.find(p => p.numericId === Number(item.product_id) || p.id === String(item.product_id));
      const entry = {
        price: (item.price || '').trim(),
        unit: (item.unit || item.price_unit || prod?.default_unit || 'kg').trim(),
        notes: (item.price_notes || '').trim(),
      };
      priceMapDict[String(item.product_id)] = entry;
      if (prod) {
        priceMapDict[prod.id] = entry;
      }
    });

    const vegCategory = catalog.categories.find(c => c.category_type === 'veg')!;
    const fruitCategory = catalog.categories.find(c => c.category_type === 'fruit')!;

    const buildTree = (catId: number) => {
      const subs = catalog.subcategories
        .filter(s => s.category_id === catId)
        .sort((a, b) => a.display_order - b.display_order);

      return subs.map(sub => {
        const prods = catalog.products
          .filter(p => p.subcategory_id === sub.id && p.active === 1)
          .sort((a, b) => a.display_order - b.display_order)
          .map(p => {
            const pInfo = priceMapDict[String(p.numericId)] || priceMapDict[p.id];
            return {
              id: p.numericId,
              slug: p.id,
              category_id: p.category_id,
              subcategory_id: p.subcategory_id,
              name: p.name,
              tamil_name: p.tamil_name,
              icon: p.icon,
              image_url: p.image_url,
              default_unit: p.default_unit,
              display_order: p.display_order,
              active: p.active,
              price: pInfo ? pInfo.price : '',
              price_unit: pInfo ? pInfo.unit : p.default_unit,
              price_notes: pInfo ? pInfo.notes : '',
            };
          });

        return {
          id: sub.id,
          category_id: sub.category_id,
          name: sub.name,
          slug: sub.slug,
          icon: sub.icon,
          display_order: sub.display_order,
          active: 1,
          products: prods,
        };
      });
    };

    const dayPayload = {
      date,
      published: !!is_published,
      notes: notes || `Wholesale rates for ${date}`,
      categories: [
        {
          id: vegCategory.id,
          name: vegCategory.name,
          slug: vegCategory.slug,
          icon: vegCategory.icon,
          category_type: 'veg',
          display_order: 1,
          active: 1,
          subcategories: buildTree(vegCategory.id),
        },
        {
          id: fruitCategory.id,
          name: fruitCategory.name,
          slug: fruitCategory.slug,
          icon: fruitCategory.icon,
          category_type: 'fruit',
          display_order: 2,
          active: 1,
          subcategories: buildTree(fruitCategory.id),
        },
      ],
      prices: priceMapDict,
    };

    // Attempt local disk write if writable
    let diskSaved = false;
    try {
      const pricesDir = path.join(process.cwd(), 'data', 'prices');
      if (!fs.existsSync(pricesDir)) fs.mkdirSync(pricesDir, { recursive: true });
      fs.writeFileSync(path.join(pricesDir, `${date}.json`), JSON.stringify(dayPayload, null, 2), 'utf8');
      diskSaved = true;
    } catch (e) {
      // Vercel read-only filesystem in cloud deployment
    }

    return NextResponse.json({
      success: true,
      message: diskSaved
        ? `Successfully saved data/prices/${date}.json to disk!`
        : `Generated price payload for ${date}. Commit to git to deploy.`,
      diskSaved,
      date,
      payload: dayPayload,
    });
  } catch (error: any) {
    console.error('Admin prices POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save prices' },
      { status: 500 }
    );
  }
}
