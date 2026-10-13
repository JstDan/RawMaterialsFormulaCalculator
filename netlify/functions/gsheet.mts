// Demo mode only: downloads the Google Sheet price list for the in-browser sync, because Google sends no
// CORS headers. With Supabase configured the sync runs in the sync-raw-materials Edge Function instead.
// Only Google Sheets / Drive file ids are accepted, and only the xlsx export is fetched.

const FILE_ID = /^[a-zA-Z0-9_-]{20,100}$/;

export default async (req: Request): Promise<Response> => {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!FILE_ID.test(id)) return new Response('Invalid sheet id', { status: 400 });

  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, { redirect: 'follow' });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.includes('text/html')) {
    return new Response(`Could not download the sheet (HTTP ${res.status}). Is it shared as "Anyone with the link"?`, {
      status: 502,
    });
  }
  return new Response(await res.arrayBuffer(), {
    headers: { 'content-type': type, 'cache-control': 'no-store' },
  });
};

