import { describe, expect, it } from 'vitest';
import { calculate, marginFromMarkup, type CalcInput } from './calc';
import { parseNum, sanitizeDecimalInput } from './numbers';
import { matchesQuery } from './search';

const FIXED = { capsules_glass: 2.5, capsules_plastic: 2.2, powder: 2.7 };

const base: CalcInput = {
  productType: 'capsules_glass',
  rows: [
    { name: 'Magnesium Bisglycinate 20%', amount: 500, unit: 'mg', pricePerKg: 7.76 },
    { name: 'Vitamin B6 ( P5P )', amount: 10, unit: 'mg', pricePerKg: 194 },
  ],
  capsulesPerDose: 2,
  quantityPerUnit: 60,
  numberOfUnits: 1000,
  markupPct: 30,
  addVat: false,
  vatRatePct: 20,
  discountPct: 0,
  extraItems: [],
  fixedCosts: FIXED,
};

describe('calculate', () => {
  it('computes cost per dose, unit cost and price for capsules', () => {
    const r = calculate(base);
    // 0.0005 kg × 7.76 + 0.00001 kg × 194 = 0.00388 + 0.00194
    expect(r.costPerDose).toBeCloseTo(0.00582, 10);
    expect(r.doseWeightMg).toBe(510);
    expect(r.fillWeightPerCapsuleMg).toBe(255);
    expect(r.dosesPerUnit).toBe(30);
    expect(r.rawCostPerUnit).toBeCloseTo(0.1746, 10);
    expect(r.unitCost).toBeCloseTo(2.6746, 10);
    // 2.6746 × 1.3 = 3.47698 → 3.48
    expect(r.unitPrice).toBe(3.48);
    expect(r.totalPriceExclVat).toBe(3480);
    expect(r.totalCost).toBeCloseTo(2674.6, 8);
    expect(r.profit).toBeCloseTo(805.4, 8);
    expect(r.vatAmount).toBe(0);
    expect(r.totalInclVat).toBe(3480);
    expect(r.complete).toBe(true);
  });

  it('adds VAT on the rounded total', () => {
    const r = calculate({ ...base, addVat: true, vatRatePct: 20 });
    expect(r.vatAmount).toBe(696);
    expect(r.totalInclVat).toBe(4176);
  });

  it('handles powder with grams and doses per pouch', () => {
    const r = calculate({
      ...base,
      productType: 'powder',
      rows: [{ name: 'Creatine Monohydrate 200 Mesh', amount: 5, unit: 'g', pricePerKg: 4.3 }],
      quantityPerUnit: 60,
      numberOfUnits: 500,
    });
    expect(r.costPerDose).toBeCloseTo(0.0215, 10);
    expect(r.dosesPerUnit).toBe(60);
    expect(r.netWeightPerPouchG).toBe(300);
    expect(r.fillWeightPerCapsuleMg).toBeNull();
    expect(r.unitCost).toBeCloseTo(1.29 + 2.7, 10);
    expect(r.unitPrice).toBe(5.19); // 3.99 × 1.3 = 5.187
    expect(r.requirements[0].totalKg).toBeCloseTo(150, 8);
    expect(r.requirements[0].cost).toBeCloseTo(645, 8);
  });

  it('converts mcg correctly', () => {
    const r = calculate({ ...base, rows: [{ name: 'Biotin 2%', amount: 250, unit: 'mcg', pricePerKg: 17 }] });
    expect(r.costPerDose).toBeCloseTo(0.00000425, 12);
  });

  it('avoids floating point drift in totals', () => {
    const r = calculate({
      ...base,
      rows: [{ name: 'X', amount: 100, unit: 'mg', pricePerKg: 1 }],
      capsulesPerDose: 1,
      quantityPerUnit: 1,
      numberOfUnits: 3,
      markupPct: 0,
      fixedCosts: { ...FIXED, capsules_glass: 0.1 },
    });
    expect(r.unitPrice).toBe(0.1);
    expect(r.totalPriceExclVat).toBe(0.3);
  });

  it('is incomplete without quantities or materials', () => {
    expect(calculate({ ...base, numberOfUnits: null }).complete).toBe(false);
    expect(calculate({ ...base, rows: [] }).complete).toBe(false);
    expect(calculate({ ...base, productType: null }).complete).toBe(false);
    expect(calculate({ ...base, capsulesPerDose: null }).complete).toBe(false);
  });
});

describe('offer lines (template)', () => {
  it('reproduces the Nutrikal offer template totals', () => {
    // Unit price 5.93, 1000 pcs, 5 % discount on the product only + three services → sub total 6353.50 EUR
    const r = calculate({
      ...base,
      productType: 'capsules_plastic',
      rows: [{ name: 'X', amount: 1, unit: 'mg', pricePerKg: 0 }],
      capsulesPerDose: 1,
      quantityPerUnit: 30,
      numberOfUnits: 1000,
      markupPct: 0,
      fixedCosts: { ...FIXED, capsules_plastic: 5.93 },
      discountPct: 5,
      extraItems: [
        { description: 'Free Sale Certificate', qty: 1, unit: 'pcs.', price: 300 },
        { description: 'Certificate of analysis', qty: 1, unit: 'pcs.', price: 220 },
        { description: 'Label design service', qty: 1, unit: 'pcs.', price: 200 },
        { description: '', qty: 1, unit: 'pcs.', price: 99 }, // incomplete rows are ignored
      ],
    });
    expect(r.unitPrice).toBe(5.93);
    expect(r.productAmount).toBe(5633.5);
    expect(r.extraLines.map((l) => l.amount)).toEqual([300, 220, 200]);
    expect(r.extrasTotal).toBe(720);
    expect(r.totalPriceExclVat).toBe(6353.5);
    expect(r.discountAmount).toBe(296.5);
    expect(r.totalInclVat).toBe(6353.5);
    // Profit only covers the product line after discount
    expect(r.profit).toBeCloseTo(5633.5 - 5930, 8);
  });

  it('applies VAT on the discounted sub total', () => {
    const r = calculate({ ...base, discountPct: 10, addVat: true, vatRatePct: 20 });
    expect(r.productAmount).toBe(3132); // 3.48 × 1000 × 0.9
    expect(r.vatAmount).toBe(626.4);
    expect(r.totalInclVat).toBe(3758.4);
  });
});

describe('helpers', () => {
  it('derives margin from markup', () => {
    expect(marginFromMarkup(30)).toBeCloseTo(23.0769, 3);
    expect(marginFromMarkup(100)).toBe(50);
  });

  it('parses comma and dot decimals', () => {
    expect(parseNum('1,5')).toBe(1.5);
    expect(parseNum('1.5')).toBe(1.5);
    expect(parseNum(' 12 ')).toBe(12);
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('1.2.3')).toBeNull();
    expect(sanitizeDecimalInput('1,2.3a')).toBe('1,23');
    expect(sanitizeDecimalInput('12.5', false)).toBe('125');
  });

  it('matches partial words anywhere in the name', () => {
    expect(matchesQuery('Magnesium Bisglycinate 20%', 'magn bis')).toBe(true);
    expect(matchesQuery('Magnesium Bisglycinate 20%', 'bis 20')).toBe(true);
    expect(matchesQuery('Magnesium Citrate Anhydrous', 'magn bis')).toBe(false);
    expect(matchesQuery('Oryza GEL 350 (оризово брашно)', 'ОРИЗ')).toBe(true);
  });
});
