import { en, type Dictionary } from './en';

// Single active dictionary for now; switch here when a Bulgarian translation is added.
export const t: Dictionary = en;

/** Replace `{key}` placeholders in a label. */
export function fmt(label: string, vars: Record<string, string | number>): string {
  return label.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
