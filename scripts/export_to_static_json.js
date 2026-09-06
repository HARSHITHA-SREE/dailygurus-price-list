const fs = require('fs');
const path = require('path');

const sqliteDumpPath = path.join(__dirname, 'sqlite_dump.json');
const dump = JSON.parse(fs.readFileSync(sqliteDumpPath, 'utf8'));

const dataDir = path.join(__dirname, '..', 'data');
const pricesDir = path.join(dataDir, 'prices');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(pricesDir)) fs.mkdirSync(pricesDir, { recursive: true });

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

// 1. Generate stable data/catalog.json
const subcategoryMap = new Map();
dump.subcategories.forEach(s => subcategoryMap.set(s.id, s));

const categoryMap = new Map();
dump.categories.forEach(c => categoryMap.set(c.id, c));

const catalogProducts = dump.products.map(p => {
  const subcat = subcategoryMap.get(p.subcategory_id);
  const cat = categoryMap.get(p.category_id);
  const stableSlug = slugify(p.name);

  return {
    id: stableSlug,
    numericId: Number(p.id),
    name: p.name,
    tamil_name: p.tamil_name || '',
    category_id: Number(p.category_id),
    category: cat ? cat.name : (p.category_id === 1 ? 'Vegetables' : 'Fruits'),
    subcategory_id: p.subcategory_id ? Number(p.subcategory_id) : null,
    subcategory: subcat ? subcat.name : '',
    default_unit: p.default_unit || 'kg',
    display_order: Number(p.display_order),
    active: Number(p.active),
    icon: p.icon || (p.category_id === 1 ? 'generic-veg.svg' : 'generic-fruit.svg'),
    image_url: p.image_url || ''
  };
});

const catalog = {
  categories: dump.categories.map(c => ({
    id: Number(c.id),
    name: c.name,
    slug: c.slug,
    category_type: c.type === 'fruit' ? 'fruit' : 'veg',
    icon: c.icon,
    display_order: Number(c.display_order),
    active: 1
  })),
  subcategories: dump.subcategories.map(s => ({
    id: Number(s.id),
    category_id: Number(s.category_id),
    name: s.name,
    slug: s.slug,
    icon: s.icon,
    display_order: Number(s.display_order),
    active: 1
  })),
  products: catalogProducts
};

fs.writeFileSync(
  path.join(dataDir, 'catalog.json'),
  JSON.stringify(catalog, null, 2),
  'utf8'
);
console.log(`✓ Created data/catalog.json with ${catalog.products.length} products`);

// 2. Group daily prices by price_date
const pricesByDate = new Map();
dump.daily_prices.forEach(dp => {
  if (!pricesByDate.has(dp.price_date)) {
    pricesByDate.set(dp.price_date, []);
  }
  pricesByDate.get(dp.price_date).push(dp);
});

// Map price_dates metadata
const dateNotes = new Map();
dump.price_dates.forEach(pd => {
  dateNotes.set(pd.price_date, pd.notes || '');
});

const fallbackNotes = {
  '2026-08-14': 'Official Rates - Morning wholesale auction prices from Koyambedu Mandi',
  '2026-08-15': 'Day 2 Market Rates - Independence Day Mandi rates',
  '2026-08-17': 'Bulk imported from market list - Monday opening auction rates'
};

const productLookup = new Map();
catalogProducts.forEach(p => {
  productLookup.set(p.numericId, p);
});

// For each date, generate data/prices/YYYY-MM-DD.json
for (const [dateStr, rows] of pricesByDate.entries()) {
  const priceMapByNumericId = new Map();
  const priceMapDict = {};

  rows.forEach(r => {
    const prod = productLookup.get(Number(r.product_id));
    const priceVal = r.price ? String(r.price).trim() : '';
    const unitVal = r.unit ? String(r.unit).trim() : (prod ? prod.default_unit : 'kg');

    const entry = {
      price: priceVal,
      unit: unitVal,
      notes: r.notes || ''
    };

    priceMapByNumericId.set(Number(r.product_id), entry);
    priceMapDict[String(r.product_id)] = entry;

    if (prod) {
      priceMapDict[prod.id] = entry;
    }
  });

  // Build full structured categories for fast direct rendering
  const vegCategory = catalog.categories.find(c => c.category_type === 'veg');
  const fruitCategory = catalog.categories.find(c => c.category_type === 'fruit');

  const buildTree = (catId) => {
    const subs = catalog.subcategories
      .filter(s => s.category_id === catId)
      .sort((a, b) => a.display_order - b.display_order);

    return subs.map(sub => {
      const prods = catalogProducts
        .filter(p => p.subcategory_id === sub.id && p.active === 1)
        .sort((a, b) => a.display_order - b.display_order)
        .map(p => {
          const pInfo = priceMapByNumericId.get(p.numericId);
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
            price_notes: pInfo ? pInfo.notes : ''
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
        products: prods
      };
    });
  };

  const dayPayload = {
    date: dateStr,
    published: true,
    notes: dateNotes.get(dateStr) || fallbackNotes[dateStr] || `Historical rates for ${dateStr}`,
    categories: [
      {
        id: vegCategory.id,
        name: vegCategory.name,
        slug: vegCategory.slug,
        icon: vegCategory.icon,
        category_type: 'veg',
        display_order: 1,
        active: 1,
        subcategories: buildTree(vegCategory.id)
      },
      {
        id: fruitCategory.id,
        name: fruitCategory.name,
        slug: fruitCategory.slug,
        icon: fruitCategory.icon,
        category_type: 'fruit',
        display_order: 2,
        active: 1,
        subcategories: buildTree(fruitCategory.id)
      }
    ],
    prices: priceMapDict
  };

  const outFile = path.join(pricesDir, `${dateStr}.json`);
  fs.writeFileSync(outFile, JSON.stringify(dayPayload, null, 2), 'utf8');
  console.log(`✓ Created data/prices/${dateStr}.json with ${rows.length} price rows`);
}

console.log('✓ All static JSON files generated successfully.');
