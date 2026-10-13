import Decimal from 'decimal.js';
import { isCapsule, type DoseUnit, type FixedCosts, type OfferForm, type ProductType } from './types';
import { parseNum, parsePositiveInt } from './numbers';

const UNIT_TO_KG: Record<DoseUnit, Decimal> = {
  mcg: new Decimal('1e-9'),
  mg: new Decimal('1e-6'),
  g: new Decimal('1e-3'),
};

export interface CalcRowInput {
  name: string;
  amount: number | null;
  unit: DoseUnit;
  pricePerKg: number;
}

export interface CalcInput {
  productType: ProductType | null;
  rows: CalcRowInput[];
  capsulesPerDose: number | null;
  quantityPerUnit: number | null;
  numberOfUnits: number | null;
  markupPct: number | null;
  addVat: boolean;
  vatRatePct: number | null;
  fixedCosts: FixedCosts;
}

export interface RequirementLine {
  name: string;
  totalKg: number;
  cost: number;
}

export interface CalcResult {
  /** True when every input needed for prices is present and valid. */
  complete: boolean;
  rowCostsPerDose: number[];
  doseWeightMg: number;
  costPerDose: number;
  fillWeightPerCapsuleMg: number | null;
  dosesPerUnit: number | null;
  netWeightPerPouchG: number | null;
  fixedCostPerUnit: number;
  rawCostPerUnit: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPriceExclVat: number;
  profit: number;
  marginPct: number;
  vatAmount: number;
  totalInclVat: number;
  requirements: RequirementLine[];
  requirementsTotalCost: number;
}

const ZERO = new Decimal(0);

/** All money maths uses decimal.js. Unit price is rounded to 2 decimals before multiplying by quantity. */
export function calculate(input: CalcInput): CalcResult {
  const capsule = isCapsule(input.productType);

  const rowKg = input.rows.map((r) => (r.amount && r.amount > 0 ? new Decimal(r.amount).mul(UNIT_TO_KG[r.unit]) : ZERO));
  const rowCost = rowKg.map((kg, i) => kg.mul(input.rows[i].pricePerKg || 0));
  const doseKg = rowKg.reduce((a, b) => a.add(b), ZERO);
  const costPerDose = rowCost.reduce((a, b) => a.add(b), ZERO);
  const doseWeightMg = doseKg.mul(1e6);

  const capsulesPerDose = input.capsulesPerDose && input.capsulesPerDose > 0 ? input.capsulesPerDose : null;
  const fillWeightPerCapsuleMg = capsule && capsulesPerDose ? doseWeightMg.div(capsulesPerDose) : null;

  let dosesPerUnit: Decimal | null = null;
  if (input.quantityPerUnit && input.quantityPerUnit > 0) {
    if (capsule) dosesPerUnit = capsulesPerDose ? new Decimal(input.quantityPerUnit).div(capsulesPerDose) : null;
    else if (input.productType === 'powder') dosesPerUnit = new Decimal(input.quantityPerUnit);
  }
  const netWeightPerPouchG =
    input.productType === 'powder' && dosesPerUnit ? doseKg.mul(1000).mul(dosesPerUnit) : null;

  const units = input.numberOfUnits && input.numberOfUnits > 0 ? input.numberOfUnits : null;
  const hasMaterial = rowKg.some((kg) => kg.gt(0));
  const complete = !!input.productType && !!dosesPerUnit && !!units && hasMaterial;

  const fixedCostPerUnit = input.productType ? new Decimal(input.fixedCosts[input.productType] ?? 0) : ZERO;
  const rawCostPerUnit = dosesPerUnit ? costPerDose.mul(dosesPerUnit) : ZERO;
  const unitCost = rawCostPerUnit.add(fixedCostPerUnit);
  const markup = new Decimal(input.markupPct ?? 0);
  const unitPrice = unitCost.mul(markup.div(100).add(1)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const qty = new Decimal(complete ? units! : 0);
  const totalCost = unitCost.mul(qty);
  const totalPrice = unitPrice.mul(qty);
  const profit = totalPrice.sub(totalCost);
  const marginPct = totalPrice.gt(0) ? profit.div(totalPrice).mul(100) : ZERO;
  const vatAmount = input.addVat
    ? totalPrice.mul(new Decimal(input.vatRatePct ?? 0).div(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    : ZERO;

  const orderDoses = dosesPerUnit && units ? dosesPerUnit.mul(units) : ZERO;
  const requirements = input.rows.map((r, i) => {
    const totalKg = rowKg[i].mul(orderDoses);
    return { name: r.name, totalKg: totalKg.toNumber(), cost: totalKg.mul(r.pricePerKg || 0).toNumber() };
  });

  return {
    complete,
    rowCostsPerDose: rowCost.map((c) => c.toNumber()),
    doseWeightMg: doseWeightMg.toNumber(),
    costPerDose: costPerDose.toNumber(),
    fillWeightPerCapsuleMg: fillWeightPerCapsuleMg?.toNumber() ?? null,
    dosesPerUnit: dosesPerUnit?.toNumber() ?? null,
    netWeightPerPouchG: netWeightPerPouchG?.toNumber() ?? null,
    fixedCostPerUnit: fixedCostPerUnit.toNumber(),
    rawCostPerUnit: rawCostPerUnit.toNumber(),
    unitCost: unitCost.toNumber(),
    unitPrice: complete ? unitPrice.toNumber() : 0,
    totalCost: totalCost.toNumber(),
    totalPriceExclVat: totalPrice.toNumber(),
    profit: profit.toNumber(),
    marginPct: marginPct.toNumber(),
    vatAmount: vatAmount.toNumber(),
    totalInclVat: totalPrice.add(vatAmount).toNumber(),
    requirements,
    requirementsTotalCost: requirements.reduce((a, r) => a.add(r.cost), ZERO).toNumber(),
  };
}

/** Margin % that results from a markup % applied on cost. */
export function marginFromMarkup(markupPct: number): number {
  if (markupPct <= -100) return 0;
  return new Decimal(markupPct).div(new Decimal(markupPct).add(100)).mul(100).toNumber();
}

export function calcInputFromForm(form: OfferForm, fixedCosts: FixedCosts): CalcInput {
  return {
    productType: form.productType,
    rows: form.rows.map((r) => ({ name: r.name, amount: parseNum(r.amount), unit: r.unit, pricePerKg: r.pricePerKg })),
    capsulesPerDose: parsePositiveInt(form.capsulesPerDose),
    quantityPerUnit: parsePositiveInt(form.quantityPerUnit),
    numberOfUnits: parsePositiveInt(form.numberOfUnits),
    markupPct: parseNum(form.markup),
    addVat: form.addVat,
    vatRatePct: parseNum(form.vatRate),
    fixedCosts: form.fixedCosts ?? fixedCosts,
  };
}
