/* ============================================================
   NexWatch – Service Worker
   Strategy: Network-first for app files (always up to date),
   cache fallback when offline so the app still loads.
   API calls (TMDB, AniList, Turso) bypass the SW entirely.
============================================================ */

const CACHE = 'nexwatch-v1';

// Domains that should always go straight to the network
const PASSTHROUGH_HOSTS = [
  'api.themoviedb.org',
  'image.tmdb.org',
  'graphql.anilist.co',
  'turso.io',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: pre-cache the app shell ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(['./', './index.html']))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, cache fallback ─────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Let API & font calls go through without caching
  if (PASSTHROUGH_HOSTS.some(h => url.hostname.includes(h))) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for the app shell
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache, fall back to index.html for navigation
        return caches.match(event.request)
          .then(cached => cached || caches.match('./index.html'));
      })
  );
});
