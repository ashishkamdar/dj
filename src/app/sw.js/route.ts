import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Captured once when the module loads — i.e. once per server boot. After
// `pm2 restart`, this changes, the SW file content differs, and browsers
// reinstall the new SW which then forces clients to reload.
const BUILD_VERSION = Date.now().toString();

const SW_BODY = `
const VERSION = '${BUILD_VERSION}';

self.addEventListener('install', () => {
  // Take over right away instead of waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const all = await self.clients.matchAll({ type: 'window' });
    for (const c of all) {
      c.postMessage({ type: 'SW_UPDATED', version: VERSION });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Network-first for navigations so HTML is always fresh.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(
        () => new Response('You are offline. Please reconnect.', { status: 503 })
      )
    );
  }
});
`;

export async function GET() {
  return new NextResponse(SW_BODY, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
