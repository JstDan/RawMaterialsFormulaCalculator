import { describe, expect, it } from 'vitest';
import { buildImportPreview, extractSheetId, parsePrice, previewToUpserts } from './materialImport';
import type { RawMaterial } from './types';

const mat = (name: string, price: number): RawMaterial => ({
  id: name,
  name,
  price_eur_per_kg: price,
  regulatory_note: null,
  active: true,
  updated_at: '',
});

const materials = [mat('Biotin 2%', 17), mat('Glycine', 6.8), mat('Taurine', 8.8)];

describe('buildImportPreview', () => {
  it('classifies new, changed, unchanged and invalid rows', () => {
    const p = buildImportPreview(
      [
        { 'Raw Material': 'Biotin 2%', 'Price DDP/EUR/kg': 18 },
        { 'Raw Material': 'glycine', 'Price DDP/EUR/kg': 6.8 },
        { 'Raw Material': 'New Extract', 'Price DDP/EUR/kg': '12,5' },
        { 'Raw Material': 'Broken', 'Price DDP/EUR/kg': 'n/a' },
        { 'Raw Material': '', 'Price DDP/EUR/kg': '' },
      ],
      materials,
    )!;
    expect(p.changed).toEqual([{ name: 'Biotin 2%', oldPrice: 17, newPrice: 18 }]);
    expect(p.unchanged).toEqual(['Glycine']);
    expect(p.added).toEqual([{ name: 'New Extract', price: 12.5 }]);
    expect(p.invalid).toHaveLength(1);
    expect(p.missing).toEqual(['Taurine']);
    expect(previewToUpserts(p)).toEqual([
      { name: 'New Extract', price_eur_per_kg: 12.5 },
      { name: 'Biotin 2%', price_eur_per_kg: 18 },
    ]);
  });

  it('tolerates header variations and rejects missing columns', () => {
    expect(buildImportPreview([{ 'raw material ': 'Taurine', 'Price DDP / EUR / kg': 9 }], materials)?.changed).toHaveLength(1);
    expect(buildImportPreview([{ Name: 'Taurine', Cost: 9 }], materials)).toBeNull();
  });
});

describe('sheet helpers', () => {
  it('parses formatted prices', () => {
    expect(parsePrice(14.7)).toBe(14.7);
    expect(parsePrice('€14.70')).toBe(14.7);
    expect(parsePrice('14,70 EUR')).toBe(14.7);
    expect(parsePrice('n/a')).toBeNull();
    expect(parsePrice('')).toBeNull();
  });

  it('extracts the file id from share links', () => {
    const id = '1dfylFe0D-xWlQ1PXcVUAGtNrPNS4bGJK';
    expect(extractSheetId(`https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing&rtpof=true`)).toBe(id);
    expect(extractSheetId(`https://drive.google.com/file/d/${id}/view`)).toBe(id);
    expect(extractSheetId(`https://drive.google.com/uc?export=download&id=${id}`)).toBe(id);
    expect(extractSheetId(id)).toBe(id);
    expect(extractSheetId('not a link')).toBeNull();
  });
});
