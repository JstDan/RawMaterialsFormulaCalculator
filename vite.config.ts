/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Demo mode only: lets the browser download the Google Sheet export (Google sends no CORS headers).
      // With Supabase configured the sync runs in the sync-raw-materials Edge Function instead.
      '/gsheet': {
        target: 'https://docs.google.com',
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/gsheet/, ''),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
