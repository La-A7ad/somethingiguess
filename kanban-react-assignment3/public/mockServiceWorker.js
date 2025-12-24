/* eslint-disable */
/* This file is based on MSW (Mock Service Worker) generated worker script.
   It is required for MSW to function in the browser.
   If you update MSW, you may regenerate it with: npx msw init public/ --save
*/
const INTEGRITY_CHECKSUM = '3c1b10f5a0f6d35d';
const bypassHeaderName = 'x-msw-bypass';
const activeClientIds = new Set();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', async (event) => {
  const message = event.data;
  if (!message) return;

  if (message.type === 'KEEPALIVE') {
    event.ports[0].postMessage('OK');
    return;
  }

  if (message.type === 'MOCK_ACTIVATE') {
    activeClientIds.add(message.clientId);
    event.ports[0].postMessage('OK');
    return;
  }

  if (message.type === 'MOCK_DEACTIVATE') {
    activeClientIds.delete(message.clientId);
    event.ports[0].postMessage('OK');
    return;
  }

  if (message.type === 'INTEGRITY_CHECK_REQUEST') {
    event.ports[0].postMessage(INTEGRITY_CHECKSUM);
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests and requests with "accept: application/json" or /api/
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  if (request.headers.get(bypassHeaderName)) return;

  if (!url.pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      const client = await self.clients.get(event.clientId);
      if (!client) return fetch(request);

      if (!activeClientIds.has(event.clientId)) return fetch(request);

      const requestId = crypto.randomUUID();

      client.postMessage({
        type: 'REQUEST',
        id: requestId,
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await request.clone().text(),
      });

      const response = await new Promise((resolve) => {
        const listener = (event) => {
          const msg = event.data;
          if (!msg || msg.type !== 'RESPONSE' || msg.id !== requestId) return;
          self.removeEventListener('message', listener);
          resolve(msg);
        };
        self.addEventListener('message', listener);
      });

      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    })()
  );
});
