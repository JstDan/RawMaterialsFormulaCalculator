import { parseNum } from './numbers';
import type { RawMaterial } from './types';

export interface ImportPreview {
  added: { name: string; price: number }[];
  changed: { name: string; oldPrice: number; newPrice: number }[];
  unchanged: string[];
  invalid: { row: number; reason: string }[];
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/** Find the "Raw Material" and "Price DDP/EUR/kg" columns, tolerating case/spacing differences. */
function findColumns(headers: string[]): { name: string; price: string } | null {
  const name = headers.find((h) => normalize(h) === 'rawmaterial');
  const price =
    headers.find((h) => normalize(h) === 'priceddpeurkg') ?? headers.find((h) => normalize(h).startsWith('price'));
  return name && price ? { name, price } : null;
}

/**
 * Compare imported rows (as produced by SheetJS sheet_to_json) with the current materials.
 * Names are matched case-insensitively; matched rows keep the existing spelling so the upsert hits them.
 * Returns null when the required columns are missing.
 */
export function buildImportPreview(rows: Record<string, unknown>[], materials: RawMaterial[]): ImportPreview | null {
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cols = findColumns(headers);
  if (!cols) return null;

  const existing = new Map(materials.map((m) => [m.name.trim().toLowerCase(), m]));
  const seen = new Map<string, { name: string; price: number }>();
  const invalid: ImportPreview['invalid'] = [];

  rows.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const name = String(r[cols.name] ?? '').trim();
    const rawPrice = r[cols.price];
    if (!name && (rawPrice === null || rawPrice === undefined || rawPrice === '')) return; // blank line
    const price = parseNum(typeof rawPrice === 'number' ? rawPrice : String(rawPrice ?? ''));
    if (!name) return invalid.push({ row: rowNo, reason: 'missing name' });
    if (price === null || price < 0) return invalid.push({ row: rowNo, reason: `${name}: invalid price "${String(rawPrice ?? '')}"` });
    seen.set(name.toLowerCase(), { name, price });
  });

  const preview: ImportPreview = { added: [], changed: [], unchanged: [], invalid };
  for (const [key, item] of seen) {
    const match = existing.get(key);
    if (!match) preview.added.push(item);
    else if (Math.abs(match.price_eur_per_kg - item.price) > 1e-9)
      preview.changed.push({ name: match.name, oldPrice: match.price_eur_per_kg, newPrice: item.price });
    else preview.unchanged.push(match.name);
  }
  return preview;
}

export function previewToUpserts(p: ImportPreview) {
  return [
    ...p.added.map((a) => ({ name: a.name, price_eur_per_kg: a.price })),
    ...p.changed.map((c) => ({ name: c.name, price_eur_per_kg: c.newPrice })),
  ];
}
