// Syncs raw-material names and prices from the Google Sheet / Drive .xlsx in settings.google_sheet_url.
// Sheet -> raw_materials: new names are inserted, changed prices updated, materials removed from the
// sheet are deactivated (hidden from the calculator, never deleted) and returning ones reactivated.
//
// Callers:
//   - the web app ("Sync" button, and the 24h fallback on app open) with the user's JWT
//   - pg_cron (daily) with the x-cron-secret header
// Deploy with: supabase functions deploy sync-raw-materials --no-verify-jwt
// Secrets:     supabase secrets set SYNC_CRON_SECRET=<same value as the vault secret>

import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';
import { buildImportPreview, buildSyncPlan, extractSheetId, sheetExportPath } from '../_shared/materialImport.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // --- Authorise: cron secret or a signed-in staff user ---------------------------------------
  const cronSecret = Deno.env.get('SYNC_CRON_SECRET');
  const body = (await req.json().catch(() => ({}))) as { source?: string };
  let source: 'manual' | 'scheduled' | 'auto';
  let userId: string | null = null;

  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
    source = 'scheduled';
  } else {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const { data, error } = token ? await admin.auth.getUser(token) : { data: null, error: true };
    if (error || !data?.user) return json({ error: 'Not authenticated' }, 401);
    userId = data.user.id;
    source = body.source === 'auto' ? 'auto' : 'manual';
  }

  const log = async (row: Record<string, unknown>) => {
    const { data } = await admin
      .from('sync_runs')
      .insert({ source, triggered_by: userId, ...row })
      .select()
      .single();
    return data;
  };

  try {
    // --- Download the spreadsheet (must be shared as "anyone with the link") -------------------
    const { data: settings, error: sErr } = await admin.from('settings').select('google_sheet_url').eq('id', 1).single();
    if (sErr) throw new Error(sErr.message);
    const fileId = extractSheetId(settings.google_sheet_url ?? '');
    if (!fileId) throw new Error('Google Sheet link in Settings is missing or invalid');

    const res = await fetch(`https://docs.google.com${sheetExportPath(fileId)}`, { redirect: 'follow' });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || type.includes('text/html')) {
      throw new Error(`Could not download the sheet (HTTP ${res.status}). Is it shared as "Anyone with the link"?`);
    }
    const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: null });

    // --- Compare and upsert --------------------------------------------------------------------
    const { data: materials, error: mErr } = await admin.from('raw_materials').select('name, price_eur_per_kg, active');
    if (mErr) throw new Error(mErr.message);
    const preview = buildImportPreview(rows, materials ?? []);
    if (!preview) throw new Error('Columns "Raw Material" and "Price DDP/EUR/kg" were not found in the first sheet');
    const plan = buildSyncPlan(preview, materials ?? []);

    if (plan.upserts.length) {
      const { error } = await admin.from('raw_materials').upsert(plan.upserts, { onConflict: 'name' });
      if (error) throw new Error(error.message);
    }
    if (plan.deactivate.length) {
      const { error } = await admin.from('raw_materials').update({ active: false }).in('name', plan.deactivate);
      if (error) throw new Error(error.message);
    }

    const run = await log({
      status: 'success',
      added: preview.added.length,
      changed: preview.changed.length,
      unchanged: preview.unchanged.length,
      invalid: preview.invalid.length,
      missing: preview.missing.length,
      removed: plan.deactivate.length,
      restored: plan.reactivate.length,
      details: {
        added: preview.added,
        changed: preview.changed,
        invalid: preview.invalid,
        removed: plan.deactivate,
        restored: plan.reactivate,
      },
    });
    return json(run);
  } catch (e) {
    const run = await log({ status: 'error', error: (e as Error).message });
    return json(run ?? { status: 'error', error: (e as Error).message }, 500);
  }
});
