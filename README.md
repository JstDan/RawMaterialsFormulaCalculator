# Nutrikal Formula Calculator

Internal web app for Nutrikal account managers: build a custom food-supplement formula, calculate cost and
selling price, and download a client-facing PDF offer.

Stack: React + TypeScript + Vite + MUI, Supabase (database + email/password auth), jsPDF for PDF offers.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key (optional, see below)
npm run dev
```

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Type-check and build to `dist/` |
| `npm test`          | Run unit tests (Vitest)         |
