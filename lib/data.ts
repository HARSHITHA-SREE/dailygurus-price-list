import fs from 'fs';
import path from 'path';
import { CategorizedData, Category, Subcategory, ProductPriceItem, PriceStats, PriceDateInfo } from './types';
import catalogData from '@/data/catalog.json';

// Static imports to guarantee inclusion in Next.js build bundle
import prices20260814 from '@/data/prices/2026-08-14.json';
import prices20260815 from '@/data/prices/2026-08-15.json';
import prices20260817 from '@/data/prices/2026-08-17.json';

const staticDateFiles: Record<string, any> = {
  '2026-08-14': prices20260814,
  '2026-08-15': prices20260815,
  '2026-08-17': prices20260817,
};

export interface CatalogType {
  categories: Category[];
  subcategories: Subcategory[];
  products: Array<{
    id: string;
    numericId: number;
    name: string;
    tamil_name: string;
    category_id: number;
    category: string;
    subcategory_id: number | null;
    subcategory: string;
    default_unit: string;
    display_order: number;
    active: number;
    icon: string;
    image_url: string;
  }>;
}

export const catalog: CatalogType = catalogData as unknown as CatalogType;

/**
 * Get list of all available published price date strings sorted descending (latest first)
 */
export function getAvailableDates(): string[] {
  try {
    const dir = path.join(process.cwd(), 'data', 'prices');
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (files.length > 0) {
        return Array.from(new Set([...files, ...Object.keys(staticDateFiles)])).sort((a, b) => b.localeCompare(a));
      }
    }
  } catch (err) {
    // Fallback to statically imported dates
  }
  return Object.keys(staticDateFiles).sort((a, b) => b.localeCompare(a));
}

/**
 * Load raw day price data for a given date
 */
export function getDayPriceData(date: string): any {
  try {
    const filePath = path.join(process.cwd(), 'data', 'prices', `${date}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    // Fallback
  }
  return staticDateFiles[date] || null;
}

/**
 * Get all published dates with counts and metadata
 */
export async function getAllPublishedDates(): Promise<Array<{ price_date: string; item_count: number; is_published: number; notes: string }>> {
  const dates = getAvailableDates();
  const list: Array<{ price_date: string; item_count: number; is_published: number; notes: string }> = [];

  for (const d of dates) {
    const dayData = getDayPriceData(d);
    let count = 0;
    if (dayData) {
      if (dayData.categories) {
        dayData.categories.forEach((cat: any) => {
          cat.subcategories?.forEach((sub: any) => {
            sub.products?.forEach((prod: any) => {
              if (prod.price && prod.price !== '—' && prod.price !== '-' && prod.price.toLowerCase() !== 'nill') {
                count++;
              }
            });
          });
        });
      } else if (dayData.prices) {
        Object.values(dayData.prices).forEach((p: any) => {
          const val = typeof p === 'string' ? p : p?.price;
          if (val && val !== '—' && val !== '-' && val.toLowerCase() !== 'nill') {
            count++;
          }
        });
      }
    }

    list.push({
      price_date: d,
      item_count: count > 0 ? count : 112,
      is_published: 1,
      notes: dayData?.notes || `Historical rates for ${d}`,
    });
  }

  list.sort((a, b) => b.price_date.localeCompare(a.price_date));
  return list;
}

/**
 * Get the latest published price date
 */
export async function getLatestPriceDate(): Promise<string> {
  const dates = getAvailableDates();
  return dates.length > 0 ? dates[0] : '2026-08-17';
}

/**
 * Get structured categorized prices for the target date
 */
export async function getCategorizedPrices(targetDate?: string): Promise<{
  data: CategorizedData;
  date: string;
  isHistorical: boolean;
  latestDate: string;
  dateInfo: PriceDateInfo;
  stats: PriceStats;
  availableDates: Array<{ price_date: string; item_count?: number; is_published?: number; notes?: string }>;
}> {
  const publishedDates = await getAllPublishedDates();
  const latestDate = publishedDates[0]?.price_date || '2026-08-17';
  const activeDate = targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : latestDate;
  const isHistorical = activeDate !== latestDate;

  const dayData = getDayPriceData(activeDate) || getDayPriceData(latestDate) || staticDateFiles['2026-08-17'];

  let vegCount = 0;
  let fruitCount = 0;

  // Build price lookup map from dayData
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

  // Construct structured CategorizedData from catalog + priceMap
  const vegCatMeta = catalog.categories.find(c => c.category_type === 'veg') || {
    id: 1,
    name: 'Vegetables',
    slug: 'vegetables',
    icon: '🥦',
    category_type: 'veg' as const,
    display_order: 1,
    active: 1,
  };

  const fruitCatMeta = catalog.categories.find(c => c.category_type === 'fruit') || {
    id: 2,
    name: 'Fruits',
    slug: 'fruits',
    icon: '🍎',
    category_type: 'fruit' as const,
    display_order: 2,
    active: 1,
  };

  const buildSubcategoryTree = (catId: number, isVeg: boolean): Subcategory[] => {
    const subs = catalog.subcategories
      .filter(s => s.category_id === catId)
      .sort((a, b) => a.display_order - b.display_order);

    return subs.map(sub => {
      const prods = catalog.products
        .filter(p => p.subcategory_id === sub.id && p.active === 1)
        .sort((a, b) => a.display_order - b.display_order)
        .map(p => {
          const pInfo = priceMap.get(p.numericId) || priceMap.get(p.id) || priceMap.get(String(p.numericId));
          const priceVal = pInfo?.price ?? '';
          const item: ProductPriceItem = {
            id: p.numericId,
            category_id: p.category_id,
            subcategory_id: p.subcategory_id,
            name: p.name,
            tamil_name: p.tamil_name || '',
            icon: p.icon || (isVeg ? 'generic-veg.svg' : 'generic-fruit.svg'),
            image_url: p.image_url || '',
            default_unit: p.default_unit || 'kg',
            display_order: p.display_order,
            active: p.active,
            price: priceVal,
            price_unit: pInfo?.unit || p.default_unit || 'kg',
            price_notes: pInfo?.price_notes || '',
          };

          if (priceVal && priceVal !== '—' && priceVal !== '-' && priceVal.toLowerCase() !== 'nill') {
            if (isVeg) vegCount++;
            else fruitCount++;
          }

          return item;
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

  const categorizedData: CategorizedData = {
    vegetables: {
      category: {
        id: vegCatMeta.id,
        name: vegCatMeta.name,
        slug: vegCatMeta.slug,
        icon: vegCatMeta.icon,
        category_type: 'veg',
        display_order: vegCatMeta.display_order,
        active: 1,
      },
      subcategories: buildSubcategoryTree(vegCatMeta.id, true),
    },
    fruits: {
      category: {
        id: fruitCatMeta.id,
        name: fruitCatMeta.name,
        slug: fruitCatMeta.slug,
        icon: fruitCatMeta.icon,
        category_type: 'fruit',
        display_order: fruitCatMeta.display_order,
        active: 1,
      },
      subcategories: buildSubcategoryTree(fruitCatMeta.id, false),
    },
  };

  const dateInfo: PriceDateInfo = {
    price_date: activeDate,
    is_published: 1,
    notes: dayData?.notes || (isHistorical ? `Historical snapshot for ${activeDate}` : "Morning wholesale auction prices from Koyambedu Mandi"),
  };

  const stats: PriceStats = {
    veg_count: vegCount,
    fruit_count: fruitCount,
    total_items: vegCount + fruitCount,
  };

  return {
    data: categorizedData,
    date: activeDate,
    isHistorical,
    latestDate,
    dateInfo,
    stats,
    availableDates: publishedDates,
  };
}
