import type { OfferForm } from '../lib/types';
import type { FieldKey } from '../lib/validation';

export interface SectionProps {
  form: OfferForm;
  setForm: (updater: (f: OfferForm) => OfferForm) => void;
  /** Error message to show for a field (only once touched or after a save/PDF attempt). */
  errorFor: (key: FieldKey) => string | undefined;
  touch: (key: FieldKey) => void;
}
