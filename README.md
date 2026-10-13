# Nutrikal Formula Calculator

Internal web app for Nutrikal account managers: build a custom food-supplement formula, calculate cost and
selling price, and download a client-facing PDF offer.

Stack: React + TypeScript + Vite + MUI, Supabase (database + email/password auth), decimal.js for money,
jsPDF + jspdf-autotable for PDF offers (Poppins, with Roboto as Cyrillic fallback), SheetJS for reading the Google Sheet
price list.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Without Supabase credentials the app runs in **local demo mode**: no login, the 148 seeded raw materials and
all offers/settings are kept in the browser's localStorage. Useful for trying it out; not for real use.

## Supabase setup

1. Create a Supabase project and copy the project URL and `anon` key into `.env.local`.
2. Run the migrations in `supabase/migrations/` in order (Supabase CLI `supabase db push`, or paste them into
   the SQL editor):
   - `…_init.sql` – tables `raw_materials`, `settings`, `offers`, offer numbering (`next_offer_no()`) and RLS
     (authenticated users only).
   - `…_seed_raw_materials.sql` – the 148 raw materials and regulatory notes.
3. In **Authentication → Providers → Email**, disable "Allow new users to sign up". Create staff accounts in
   **Authentication → Users → Add user**.

### Google Sheet price-list sync

Raw material names and prices are pulled one-way from the spreadsheet in **Settings → Google Sheet link**
(default: the Nutrikal price list in Drive). It must be shared as *Anyone with the link – Viewer* and have the
columns `Raw Material` and `Price DDP/EUR/kg` in the first sheet. The sheet is the source of truth: new names
are added, changed prices updated, and materials removed from the sheet are **deactivated** (hidden from the
calculator, never deleted, saved offers unaffected); they are reactivated if they come back. A sheet with no valid
rows is rejected so the price list can never be wiped by accident. Works for native Google Sheets and for `.xlsx`
files stored in Drive.

- **Manual:** "Sync" button on the Raw materials page.
- **Daily:** pg_cron calls the Edge Function at 03:00 UTC.
- **Fallback:** when the app is open and the last sync is older than 24 h, it syncs automatically.

Setup:

```bash
supabase functions deploy sync-raw-materials --no-verify-jwt   # the function checks auth itself
supabase secrets set SYNC_CRON_SECRET=<random string>
```

Then in the SQL editor (before or after running `…_google_sheet_sync.sql`):

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<same random string>', 'sync_cron_secret');
```

Every run is logged in the `sync_runs` table. In local demo mode the sync works with `npm run dev`
(through the Vite proxy), because Google does not allow direct browser downloads.

The seed is generated from `Data/Raw_Materials_Price_List.xlsx`. After changing the spreadsheet, regenerate it
with `node scripts/generate-seed.mjs`. After setup, all changes to raw materials are made in the Google Sheet.

## How it works

- **Calculator** (`/`) – one page, sections 1–6 with live results below. The draft is kept in localStorage
  until "New offer". Offer numbers (`NK-YYYY-0001`) are reserved when a new offer is started.
- **Saved offers** (`/offers`) – each saved offer stores all inputs plus a snapshot of the raw material prices
  and fixed costs used, so later price changes never alter it.
- **Raw materials** (`/materials`) – read-only list synced from the Google Sheet (the **only** place to add,
  remove or reprice materials); the regulatory note is the one editable field. Also holds the settings (fixed
  costs, defaults, company details, logo, terms, Google Sheet link). The database enforces this: staff users can
  only update `regulatory_note`.
- The PDF only receives client-safe data (`toPdfModel` in `src/lib/pdf.ts`); costs, markup, margin, profit and
  purchasing requirements never reach it.
- **PDF offer** follows Nutrikal's offer template: brand marks, OFFER / Number / Date / Due at, CUSTOMER and
  SUPPLIER blocks, a DESCRIPTION / QTY / UNIT / PRICE / DISCOUNT % / AMOUNT table (product line + extra lines such as
  certificates), Sub Total / Tax VAT / Payment total, bank details or VAT exemption, payment terms and a note with
  packaging and composition per dose. Supplier, bank, texts and extra-line presets are edited in Settings; the
  migration `…_offer_template.sql` adds them to Supabase.
- All UI labels are in `src/i18n/en.ts`; add `bg.ts` with the same shape for Bulgarian.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Type-check and build to `dist/` |
| `npm test`          | Run unit tests (Vitest)         |
