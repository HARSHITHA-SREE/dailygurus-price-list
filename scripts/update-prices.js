#!/usr/bin/env node
/**
 * DailyGurus Price List - Daily Price Update Tool (Static JSON Architecture)
 * 
 * Usage:
 *   node scripts/update-prices.js [YYYY-MM-DD] [input-file.txt]
 * 
 * Example:
 *   node scripts/update-prices.js 2026-08-18 today_prices.txt
 *   node scripts/update-prices.js (defaults to today's date in IST)
 */

const fs = require('fs');
const path = require('path');

// Timezone: Asia/Kolkata
function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

const args = process.argv.slice(2);
const targetDate = args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : getTodayIST();
const inputFile = args[1] || (args[0] && !/^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : null);

console.log('================================================================');
console.log('🥦 DailyGurus Price List — Static Price Updater');
console.log(`📅 Target Date: ${targetDate}`);
console.log('================================================================\n');

// 1. Load Catalog
const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
if (!fs.existsSync(catalogPath)) {
  console.error('Error: data/catalog.json not found. Run npm run build first.');
  process.exit(1);
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
console.log(`✓ Loaded catalog with ${catalog.products.length} products`);

// 2. Load previous published day to inherit fallback prices
const pricesDir = path.join(__dirname, '..', 'data', 'prices');
const existingFiles = fs.existsSync(pricesDir)
  ? fs.readdirSync(pricesDir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort()
  : [];

const previousDate = existingFiles.filter(d => d < targetDate).pop();
let previousPriceData = null;
if (previousDate) {
  const prevFile = path.join(pricesDir, `${previousDate}.json`);
  if (fs.existsSync(prevFile)) {
    previousPriceData = JSON.parse(fs.readFileSync(prevFile, 'utf8'));
    console.log(`✓ Loaded previous day rates from ${previousDate} as base`);
  }
}

// 3. Read input text if provided
let rawInputText = '';
if (inputFile) {
  const resolvedPath = path.resolve(process.cwd(), inputFile);
  if (fs.existsSync(resolvedPath)) {
    rawInputText = fs.readFileSync(resolvedPath, 'utf8');
    console.log(`✓ Read price text from: ${inputFile} (${rawInputText.length} characters)`);
  } else {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }
}

// Simple WhatsApp / text price parser
function parseTextLines(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const parsedItems = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('//') || line.toLowerCase().includes('rates') || line.toLowerCase().includes('market')) {
      continue;
    }

    // Patterns like: "Tomato big crates (premium): 700" or "Tomato big - 700" or "Tomato 650"
    let match = line.match(/^(.+?)[:\-=]\s*([0-9\/\.\s\(\)a-zA-Z\-_]+)$/);
    if (!match) {
      match = line.match(/^(.+?)\s{2,}([0-9\/\.\s\(\)a-zA-Z\-_]+)$/);
    }
    if (!match) {
      match = line.match(/^([a-zA-Z\s\(\)]+)\s+([0-9\/\-]+(?:\s*\(.*?\))?)$/);
    }

    if (match) {
      const rawName = match[1].trim();
      const rawPrice = match[2].trim();
      parsedItems.push({ rawName, rawPrice, line });
    }
  }

  return parsedItems;
}

// Fuzzy match against catalog products
function findProduct(rawName) {
  const clean = rawName.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 2);

  let bestMatch = null;
  let bestScore = 0;

  for (const prod of catalog.products) {
    const prodClean = prod.name.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const tamilClean = (prod.tamil_name || '').trim();

    if (clean === prodClean || rawName.trim().toLowerCase() === prod.name.toLowerCase()) {
      return { product: prod, confidence: 1.0 };
    }

    if (tamilClean && rawName.includes(tamilClean)) {
      return { product: prod, confidence: 0.95 };
    }

    // Word intersection score
    let matches = 0;
    for (const w of words) {
      if (prodClean.includes(w)) matches++;
    }

    const score = words.length > 0 ? matches / words.length : 0;
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = prod;
    }
  }

  return bestMatch ? { product: bestMatch, confidence: bestScore } : null;
}

// Build price dictionary
const priceMapDict = {};

// Pre-fill with previous day or empty
catalog.products.forEach(p => {
  const prev = previousPriceData?.prices ? (previousPriceData.prices[p.id] || previousPriceData.prices[String(p.numericId)]) : null;
  const entry = {
    price: prev ? prev.price : '',
    unit: prev ? prev.unit : p.default_unit,
    notes: '',
  };
  priceMapDict[p.id] = entry;
  priceMapDict[String(p.numericId)] = entry;
});

let matchedCount = 0;
const unmatchedLines = [];

if (rawInputText) {
  const parsed = parseTextLines(rawInputText);
  console.log(`\nParsing ${parsed.length} candidate lines from input...`);

  for (const item of parsed) {
    const result = findProduct(item.rawName);
    if (result && result.product) {
      const prod = result.product;
      const entry = {
        price: item.rawPrice,
        unit: prod.default_unit,
        notes: '',
      };
      priceMapDict[prod.id] = entry;
      priceMapDict[String(prod.numericId)] = entry;
      matchedCount++;
      console.log(`  ✓ Matched: "${item.rawName}" ➔ ${prod.name} = ₹${item.rawPrice}`);
    } else {
      unmatchedLines.push(item.line);
    }
  }

  console.log(`\nMatched ${matchedCount} / ${parsed.length} lines.`);
  if (unmatchedLines.length > 0) {
    console.log(`\n⚠️  ${unmatchedLines.length} unmatched lines:`);
    unmatchedLines.forEach(l => console.log(`   - ${l}`));
  }
}

// Generate the day's full structured JSON
const vegCategory = catalog.categories.find(c => c.category_type === 'veg');
const fruitCategory = catalog.categories.find(c => c.category_type === 'fruit');

const buildTree = (catId) => {
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
          unit: pInfo ? pInfo.unit : p.default_unit,
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
  date: targetDate,
  published: true,
  notes: `Official Koyambedu wholesale auction rates for ${targetDate}`,
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

// Write output file
if (!fs.existsSync(pricesDir)) fs.mkdirSync(pricesDir, { recursive: true });
const targetFile = path.join(pricesDir, `${targetDate}.json`);
fs.writeFileSync(targetFile, JSON.stringify(dayPayload, null, 2), 'utf8');

console.log('\n================================================================');
console.log(`🎉 SUCCESS: Generated static price file: data/prices/${targetDate}.json`);
console.log(`Total Products: ${catalog.products.length}`);
console.log('\nTo deploy these prices live to pricelist.reginaldalfret.tech:');
console.log(`  git add data/prices/${targetDate}.json`);
console.log(`  git commit -m "Add wholesale prices for ${targetDate}"`);
console.log(`  git push origin main`);
console.log('================================================================\n');
