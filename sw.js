// CATS Academic Companion — Service Worker
// Handles PWA caching + Web Push notifications

const CACHE_NAME = 'cats-v2';
const STATIC_ASSETS = ['/Cats-tracker/'];

// ── Install & Cache ──────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch — network-first for API, cache-first for static ───────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('supabase.co') || url.includes('anthropic.com')) {
    // Always network for API calls
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let payload = { title: 'CATS Academic Companion', body: 'You have an update.', icon: '', badge: '', url: '/Cats-tracker/', tag: 'cats-general' };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch(e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || 'https://www.arizona.edu/sites/default/files/2019-11/ua_stack_rgb_4.png',
    badge: payload.badge || 'https://www.arizona.edu/sites/default/files/2019-11/ua_stack_rgb_4.png',
    tag: payload.tag || 'cats-general',
    renotify: true,
    requireInteraction: false,
    data: { url: payload.url || '/Cats-tracker/' },
    actions: payload.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/Cats-tracker/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('Cats-tracker') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
