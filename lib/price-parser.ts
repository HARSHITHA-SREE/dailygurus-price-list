/**
 * DailyGurus Price List - Price Parser for Graph Visualization
 * Extracts graphable numeric values from complex TEXT price strings.
 * 
 * Rules:
 * - '650' → single value 650
 * - '1900/1950' → range min=1900, max=1950
 * - '1850/1800' → range min=1800, max=1850 (auto-sorted)
 * - '1300 (20kg box)' → single value 1300, unit='20kg box'
 * - '15/kg' → single value 15, unit='kg'
 * - 'Nill', '', '—', 'na' → ungraphable
 * - '30 200 150/5', '10 (300-250g) 15' → ungraphable (too complex)
 * 
 * NEVER averages. NEVER guesses. If ambiguous, marks as ungraphable.
 */

import { ParsedPrice } from './types';

/**
 * Parse a raw TEXT price string into a graphable numeric representation.
 */
export function parsePriceForGraph(raw: string | null | undefined, defaultUnit?: string): ParsedPrice {
  if (!raw || !raw.trim()) {
    return { type: 'ungraphable' };
  }

  const clean = raw.trim();

  // Check for non-numeric sentinel values
  const lower = clean.toLowerCase();
  if (lower === 'nill' || lower === 'nil' || lower === 'na' || lower === 'n/a' || clean === '—' || clean === '-') {
    return { type: 'ungraphable' };
  }

  // Pattern: "1300 (20kg box)" — single number followed by parenthesized unit
  const unitInParens = clean.match(/^(\d+(?:,\d+)*)\s*\((.+?)\)$/);
  if (unitInParens) {
    const num = parseFloat(unitInParens[1].replace(/,/g, ''));
    if (!isNaN(num)) {
      return { type: 'single', min: num, max: num, unit: unitInParens[2].trim() };
    }
  }

  // Pattern: "15/kg" — number followed by slash+unit (non-numeric after slash)
  const numSlashUnit = clean.match(/^(\d+(?:,\d+)*)\s*\/\s*([a-zA-Z].*)$/);
  if (numSlashUnit) {
    const num = parseFloat(numSlashUnit[1].replace(/,/g, ''));
    if (!isNaN(num)) {
      return { type: 'single', min: num, max: num, unit: numSlashUnit[2].trim() };
    }
  }

  // Pattern: "550/600 (box)" — range with optional parenthesized unit
  const rangeWithUnit = clean.match(/^(\d+(?:,\d+)*)\s*\/\s*(\d+(?:,\d+)*)\s*\((.+?)\)$/);
  if (rangeWithUnit) {
    const a = parseFloat(rangeWithUnit[1].replace(/,/g, ''));
    const b = parseFloat(rangeWithUnit[2].replace(/,/g, ''));
    if (!isNaN(a) && !isNaN(b)) {
      return {
        type: 'range',
        min: Math.min(a, b),
        max: Math.max(a, b),
        unit: rangeWithUnit[3].trim(),
      };
    }
  }

  // Pattern: "1900/1950" — two numbers separated by slash
  const slashRange = clean.match(/^(\d+(?:,\d+)*)\s*\/\s*(\d+(?:,\d+)*)$/);
  if (slashRange) {
    const a = parseFloat(slashRange[1].replace(/,/g, ''));
    const b = parseFloat(slashRange[2].replace(/,/g, ''));
    if (!isNaN(a) && !isNaN(b)) {
      return {
        type: 'range',
        min: Math.min(a, b),
        max: Math.max(a, b),
        unit: defaultUnit,
      };
    }
  }

  // Pattern: clean single number "650", "1,300"
  const singleNum = clean.match(/^(\d+(?:,\d+)*)(?:\.\d+)?$/);
  if (singleNum) {
    const num = parseFloat(clean.replace(/,/g, ''));
    if (!isNaN(num)) {
      return { type: 'single', min: num, max: num, unit: defaultUnit };
    }
  }

  // Pattern: "40 35" — exactly two space-separated numbers
  const spaceDual = clean.match(/^(\d+(?:,\d+)*)\s+(\d+(?:,\d+)*)$/);
  if (spaceDual) {
    const a = parseFloat(spaceDual[1].replace(/,/g, ''));
    const b = parseFloat(spaceDual[2].replace(/,/g, ''));
    if (!isNaN(a) && !isNaN(b)) {
      return {
        type: 'range',
        min: Math.min(a, b),
        max: Math.max(a, b),
        unit: defaultUnit,
      };
    }
  }

  // Everything else is too complex to safely graph
  return { type: 'ungraphable' };
}

/**
 * Format a number as Indian Rupee display string.
 */
export function formatRupee(value: number): string {
  return '₹' + value.toLocaleString('en-IN');
}
