import type { SupabaseClient } from '@supabase/supabase-js';
import type { OfferInput, OfferRecord, RawMaterial, Settings } from '../lib/types';
import type { DataRepo, MaterialImportItem } from './repo';

interface SettingsRow {
  fixed_cost_capsules_glass: number | string;
  fixed_cost_capsules_plastic: number | string;
  fixed_cost_powder: number | string;
  default_markup: number | string;
  default_vat_rate: number | string;
  company_name: string;
  company_address: string;
  company_vat: string;
  company_email: string;
  company_phone: string;
  logo_data_url: string | null;
  terms_text: string;
}

// Postgres numeric columns arrive as strings or numbers depending on size.
const num = (v: number | string | null | undefined) => Number(v ?? 0);

function toMaterial(r: RawMaterial): RawMaterial {
  return { ...r, price_eur_per_kg: num(r.price_eur_per_kg) };
}

function toOffer(r: OfferRecord): OfferRecord {
  return { ...r, total_excl_vat: num(r.total_excl_vat), total_incl_vat: num(r.total_incl_vat) };
}

function fromSettingsRow(r: SettingsRow): Settings {
  return {
    fixed_costs: {
      capsules_glass: num(r.fixed_cost_capsules_glass),
      capsules_plastic: num(r.fixed_cost_capsules_plastic),
      powder: num(r.fixed_cost_powder),
    },
    default_markup: num(r.default_markup),
    default_vat_rate: num(r.default_vat_rate),
    company_name: r.company_name,
    company_address: r.company_address,
    company_vat: r.company_vat,
    company_email: r.company_email,
    company_phone: r.company_phone,
    logo_data_url: r.logo_data_url,
    terms_text: r.terms_text,
  };
}

function toSettingsRow(s: Settings): SettingsRow {
  return {
    fixed_cost_capsules_glass: s.fixed_costs.capsules_glass,
    fixed_cost_capsules_plastic: s.fixed_costs.capsules_plastic,
    fixed_cost_powder: s.fixed_costs.powder,
    default_markup: s.default_markup,
    default_vat_rate: s.default_vat_rate,
    company_name: s.company_name,
    company_address: s.company_address,
    company_vat: s.company_vat,
    company_email: s.company_email,
    company_phone: s.company_phone,
    logo_data_url: s.logo_data_url,
    terms_text: s.terms_text,
  };
}

export function createSupabaseRepo(sb: SupabaseClient): DataRepo {
  const check = <T>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  return {
    mode: 'supabase',

    async listMaterials() {
      const data = check(await sb.from('raw_materials').select('*').order('name'));
      return (data as RawMaterial[]).map(toMaterial);
    },

    async addMaterial(m) {
      const data = check(await sb.from('raw_materials').insert(m).select().single());
      return toMaterial(data as RawMaterial);
    },

    async updateMaterial(id, patch) {
      const data = check(await sb.from('raw_materials').update(patch).eq('id', id).select().single());
      return toMaterial(data as RawMaterial);
    },

    async importMaterials(items: MaterialImportItem[]) {
      if (!items.length) return;
      check(await sb.from('raw_materials').upsert(items, { onConflict: 'name' }));
    },

    async getSettings() {
      const data = check(await sb.from('settings').select('*').eq('id', 1).single());
      return fromSettingsRow(data as SettingsRow);
    },

    async saveSettings(s) {
      const data = check(await sb.from('settings').update(toSettingsRow(s)).eq('id', 1).select().single());
      return fromSettingsRow(data as SettingsRow);
    },

    async nextOfferNo() {
      return check(await sb.rpc('next_offer_no')) as string;
    },

    async listOffers() {
      const data = check(await sb.from('offers').select('*').order('created_at', { ascending: false }));
      return (data as OfferRecord[]).map(toOffer);
    },

    async getOffer(id) {
      const data = check(await sb.from('offers').select('*').eq('id', id).maybeSingle());
      return data ? toOffer(data as OfferRecord) : null;
    },

    async saveOffer(offer: OfferInput) {
      const { id, ...fields } = offer;
      const res = id
        ? await sb.from('offers').update(fields).eq('id', id).select().single()
        : await sb.from('offers').insert(fields).select().single();
      return toOffer(check(res) as OfferRecord);
    },

    async deleteOffer(id) {
      check(await sb.from('offers').delete().eq('id', id));
    },
  };
}
