import { t } from '../i18n';
import { parseNum, parsePositiveInt } from './numbers';
import { isCapsule, type OfferForm } from './types';

export type FieldKey =
  | 'receiver.fullName'
  | 'receiver.email'
  | 'productType'
  | 'rows'
  | 'capsulesPerDose'
  | 'quantityPerUnit'
  | 'numberOfUnits';

/** Field order = order on the page, used to scroll to the first error. */
export const FIELD_ORDER: FieldKey[] = [
  'receiver.fullName',
  'receiver.email',
  'productType',
  'rows',
  'capsulesPerDose',
  'quantityPerUnit',
  'numberOfUnits',
];

export const fieldId = (key: FieldKey) => `field-${key.replace('.', '-')}`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export type ValidationErrors = Partial<Record<FieldKey, string>>;

export function validateOffer(form: OfferForm): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!form.receiver.fullName.trim()) errors['receiver.fullName'] = t.validation.required;
  if (!form.receiver.email.trim()) errors['receiver.email'] = t.validation.required;
  else if (!isValidEmail(form.receiver.email)) errors['receiver.email'] = t.validation.email;
  if (!form.productType) errors.productType = t.validation.productType;
  if (!form.rows.some((r) => (parseNum(r.amount) ?? 0) > 0)) errors.rows = t.validation.materials;
  if (isCapsule(form.productType) && !parsePositiveInt(form.capsulesPerDose))
    errors.capsulesPerDose = t.validation.positiveInt;
  if (!parsePositiveInt(form.quantityPerUnit)) errors.quantityPerUnit = t.validation.positiveInt;
  if (!parsePositiveInt(form.numberOfUnits)) errors.numberOfUnits = t.validation.positiveInt;
  return errors;
}

export function firstError(errors: ValidationErrors): FieldKey | null {
  return FIELD_ORDER.find((k) => errors[k]) ?? null;
}
