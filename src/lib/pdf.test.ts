import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calcInputFromForm, calculate } from './calc';
import { createOfferPdf, offerFileName, toPdfModel, type PdfImage } from './pdf';
import { DEFAULT_SETTINGS, type OfferForm } from './types';

const assets = join(__dirname, '..', 'assets');
const b64 = (...p: string[]) => readFileSync(join(assets, ...p)).toString('base64');
const fonts = {
  poppinsRegular: b64('fonts', 'Poppins-Regular.ttf'),
  poppinsSemiBold: b64('fonts', 'Poppins-SemiBold.ttf'),
  poppinsBold: b64('fonts', 'Poppins-Bold.ttf'),
  robotoRegular: b64('fonts', 'Roboto-Regular.ttf'),
  robotoBold: b64('fonts', 'Roboto-Bold.ttf'),
};
const brandLogos: [PdfImage, PdfImage] = [
  { dataUrl: `data:image/png;base64,${b64('brand', 'logo-nutrikal.png')}`, width: 270, height: 270 },
  { dataUrl: `data:image/png;base64,${b64('brand', 'logo-madebynature.png')}`, width: 276, height: 270 },
];
const images = { customLogo: null, brandLogos };

const sampleForm: OfferForm = {
  id: null,
  receiver: {
    fullName: 'Kastriot Uruqi',
    address: '',
    city: '',
    zip: '',
    country: 'Косово',
    phone: '',
    email: 'client@example.com',
  },
  invoice: { companyName: '', identificationNo: '', registrationAddress: '', vatNumber: '' },
  offer: { offerNo: 'NK-2026-0001', offerDate: '2026-09-14', validUntil: '2026-10-14', productName: '' },
  productType: 'capsules_plastic',
  rows: [
    { key: '1', materialId: 'a', name: 'Citicoline', pricePerKg: 122, regulatoryNote: null, amount: '250', unit: 'mg' },
    { key: '2', materialId: 'b', name: 'L-Theanine (from Green Tea)', pricePerKg: 26.5, regulatoryNote: null, amount: '200', unit: 'mg' },
    { key: '3', materialId: 'c', name: 'Rhodiola Rosa Extract 3% rosavine 1% salidrose', pricePerKg: 140.85, regulatoryNote: null, amount: '200', unit: 'mg' },
  ],
  capsulesPerDose: '1',
  capsuleSize: 'size00',
  maxFillMg: '730',
  quantityPerUnit: '30',
  numberOfUnits: '1000',
  markup: '30',
  addVat: false,
  vatRate: '20',
  discount: '5',
  extraItems: [
    { key: 'x1', description: 'Free Sale Certificate', qty: '1', unit: 'pcs.', price: '300' },
    { key: 'x2', description: 'Certificate of analysis', qty: '1', unit: 'pcs.', price: '220' },
    { key: 'x3', description: 'Label design service', qty: '1', unit: 'pcs.', price: '200' },
  ],
  paymentTerms: '100% advance payment',
  includeComposition: true,
  notes: '',
  fixedCosts: null,
};

describe('offer PDF (Nutrikal template)', () => {
  const result = calculate(calcInputFromForm(sampleForm, DEFAULT_SETTINGS.fixed_costs));
  const model = toPdfModel(sampleForm, result, DEFAULT_SETTINGS, images);

  it('model contains only client-safe data', () => {
    const json = JSON.stringify({ ...model, brandLogos: null });
    expect(json).not.toContain('pricePerKg');
    expect(json).not.toContain('122'); // raw material price per kg
    expect(json).not.toMatch(/markup|margin|profit|fixed|requirement|costPerDose|unitCost/i);
  });

  it('builds the template lines, totals and note', () => {
    expect(model.lines.map((l) => [l.description, l.qty, l.unit, l.discountPct])).toEqual([
      ['Custom formula - 30 capsules with plastic bottles', 1000, 'pcs', 5],
      ['Free Sale Certificate', 1, 'pcs.', 5],
      ['Certificate of analysis', 1, 'pcs.', 5],
      ['Label design service', 1, 'pcs.', 5],
    ]);
    expect(model.lines.slice(1).map((l) => l.amount)).toEqual([285, 209, 190]);
    expect(model.subtotal).toBe(result.totalPriceExclVat);
    expect(model.vatAmount).toBe(0);
    expect(model.vatExemptionText).toBe('VAT Exemption');
    expect(model.customer).toEqual({
      name: 'Kastriot Uruqi',
      identificationNo: '',
      vatNumber: '',
      contactPerson: 'Kastriot Uruqi',
      addressLines: ['Косово'],
    });
    expect(model.supplier.name).toBe('Nutrikal Ltd');
    expect(model.paymentTerms).toBe('100% advance payment');
    expect(model.noteLines).toEqual([
      'Plastic bottles, 30 capsules each, capsule size 00.',
      'Per capsule: Citicoline 250 mg | L-Theanine (from Green Tea) 200 mg | Rhodiola Rosa Extract 3% rosavine 1% salidrose 200 mg',
    ]);
    const noComposition = toPdfModel({ ...sampleForm, includeComposition: false }, result, DEFAULT_SETTINGS, images);
    expect(noComposition.noteLines).toHaveLength(1);
    const withVat = { ...sampleForm, addVat: true };
    const vatModel = toPdfModel(withVat, calculate(calcInputFromForm(withVat, DEFAULT_SETTINGS.fixed_costs)), DEFAULT_SETTINGS, images);
    expect(vatModel.vatExemptionText).toBeNull();
    expect(vatModel.vatAmount).toBeGreaterThan(0);
  });

  it('renders an A4 PDF with Poppins and a Cyrillic fallback font', () => {
    const doc = createOfferPdf(model, fonts);
    expect(doc.getNumberOfPages()).toBe(1);
    doc.setFont('Roboto', 'normal');
    const notdef = doc.getTextWidth('');
    expect(doc.getTextWidth('Ж')).not.toBe(notdef);
    const pdf = doc.output();
    expect(pdf.startsWith('%PDF')).toBe(true);
    expect(pdf).toContain('Poppins');
    expect(pdf).toContain('/FontFile2');
  });

  it('builds the file name from company or receiver', () => {
    const withCompany = { ...sampleForm, invoice: { ...sampleForm.invoice, companyName: 'Фирма ООД' } };
    expect(offerFileName(withCompany)).toBe('Offer_NK-2026-0001_Фирма_ООД.pdf');
    expect(offerFileName(sampleForm)).toBe('Offer_NK-2026-0001_Kastriot_Uruqi.pdf');
  });
});
