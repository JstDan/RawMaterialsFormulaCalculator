# Nutrikal Formula Calculator

Internal web app for Nutrikal account managers: build a custom food-supplement formula, calculate cost and
selling price, and download a client-facing PDF offer.

Stack: React + TypeScript + Vite + MUI, Supabase (database + email/password auth), decimal.js for money,
jsPDF + jspdf-autotable for PDF offers (embedded Roboto for Cyrillic), SheetJS for Excel/CSV import.

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

The seed is generated from `Data/Raw_Materials_Price_List.xlsx`. After changing the spreadsheet, regenerate it
with `node scripts/generate-seed.mjs` (later price updates are easier through the in-app import).

## How it works

- **Calculator** (`/`) – one page, sections 1–6 with live results below. The draft is kept in localStorage
  until "New offer". Offer numbers (`NK-YYYY-0001`) are reserved when a new offer is started.
- **Saved offers** (`/offers`) – each saved offer stores all inputs plus a snapshot of the raw material prices
  and fixed costs used, so later price changes never alter it.
- **Raw materials** (`/materials`) – edit prices/notes, deactivate, import Excel/CSV
  (`Raw Material`, `Price DDP/EUR/kg`), and settings (fixed costs, defaults, company details, logo, terms).
- The PDF only receives client-safe data (`toPdfModel` in `src/lib/pdf.ts`); costs, markup, margin, profit and
  purchasing requirements never reach it.
- All UI labels are in `src/i18n/en.ts`; add `bg.ts` with the same shape for Bulgarian.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Type-check and build to `dist/` |
| `npm test`          | Run unit tests (Vitest)         |
