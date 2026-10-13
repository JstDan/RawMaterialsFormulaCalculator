import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calcInputFromForm, calculate } from './calc';
import { createOfferPdf, offerFileName, toPdfModel } from './pdf';
import { DEFAULT_SETTINGS, type OfferForm } from './types';

const fontsDir = join(__dirname, '..', 'assets', 'fonts');
const fonts = {
  regular: readFileSync(join(fontsDir, 'Roboto-Regular.ttf')).toString('base64'),
  bold: readFileSync(join(fontsDir, 'Roboto-Bold.ttf')).toString('base64'),
};

const form: OfferForm = {
  id: null,
  receiver: {
    fullName: 'Иван Петров',
    address: 'ул. Витоша 1',
    city: 'София',
    zip: '1000',
    country: 'Bulgaria',
    phone: '',
    email: 'ivan@example.com',
  },
  invoice: { companyName: 'Фирма ООД', registrationAddress: '', vatNumber: 'BG123456789' },
  offer: { offerNo: 'NK-2026-0001', offerDate: '2026-10-13', validUntil: '2026-11-12', productName: 'Magnesium + B6' },
  productType: 'capsules_plastic',
  rows: [
    { key: '1', materialId: 'a', name: 'Magnesium Bisglycinate 20%', pricePerKg: 7.76, regulatoryNote: null, amount: '500', unit: 'mg' },
    { key: '2', materialId: 'b', name: 'Oryza GEL 350 (оризово брашно)', pricePerKg: 1.8, regulatoryNote: null, amount: '50', unit: 'mg' },
  ],
  capsulesPerDose: '2',
  capsuleSize: 'size0',
  maxFillMg: '500',
  quantityPerUnit: '60',
  numberOfUnits: '1000',
  markup: '30',
  addVat: true,
  vatRate: '20',
  includeComposition: true,
  notes: 'Бележка към клиента',
  fixedCosts: null,
};

describe('offer PDF', () => {
  const result = calculate(calcInputFromForm(form, DEFAULT_SETTINGS.fixed_costs));

  it('model contains only client-safe data', () => {
    const model = toPdfModel(form, result, DEFAULT_SETTINGS, null);
    const json = JSON.stringify(model);
    expect(json).not.toContain('pricePerKg');
    expect(json).not.toContain('7.76');
    expect(json).not.toMatch(/markup|margin|profit|fixed|requirement|costPerDose/i);
    expect(model.composition).toEqual([
      { name: 'Magnesium Bisglycinate 20%', amount: '500', unit: 'mg' },
      { name: 'Oryza GEL 350 (оризово брашно)', amount: '50', unit: 'mg' },
    ]);
    expect(toPdfModel({ ...form, includeComposition: false }, result, DEFAULT_SETTINGS, null).composition).toBeNull();
  });

  it('renders an A4 PDF with an embedded Unicode font covering Cyrillic', () => {
    const doc = createOfferPdf(toPdfModel(form, result, DEFAULT_SETTINGS, null), fonts);
    expect(doc.getNumberOfPages()).toBe(1);
    doc.setFont('Roboto', 'normal');
    // Glyphs present in the font have real widths; missing ones fall back to the same .notdef width.
    const notdef = doc.getTextWidth('');
    expect(doc.getTextWidth('Ж')).not.toBe(notdef);
    expect(doc.getTextWidth('я')).not.toBe(notdef);
    const pdf = doc.output();
    expect(pdf.startsWith('%PDF')).toBe(true);
    expect(pdf).toContain('/FontFile2');
  });

  it('builds the file name from company or receiver', () => {
    expect(offerFileName(form)).toBe('Offer_NK-2026-0001_Фирма_ООД.pdf');
    expect(offerFileName({ ...form, invoice: { ...form.invoice, companyName: '' } })).toBe(
      'Offer_NK-2026-0001_Иван_Петров.pdf',
    );
  });
});
