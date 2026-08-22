// ميعاد — service worker.
//
// Deliberately conservative about what it caches: this app shows medical records,
// so nothing patient-related may ever sit in a cache the next person on the device
// could read. Only same-origin static build output is cached — every Supabase call
// (auth, data, the assistant function) goes straight to the network, always.
//
// Bump CACHE when the shell changes; activate() deletes every older cache.
const CACHE = 'meaad-v1';

// The shell needed to render something offline. Hashed /assets/* files aren't listed
// because their names change per build — they're picked up at runtime instead.
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/tokens/fonts.css',
  '/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/tokens/colors.css',
  '/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/tokens/typography.css',
  '/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/tokens/spacing.css',
  '/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/tokens/shadows.css',
  '/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/styles.css',
  '/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/_ds_bundle.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    // addAll() is all-or-nothing — one 404 would abandon the whole install, so each
    // entry is fetched individually and a miss is tolerated.
    caches.open(CACHE)
      .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Anything not served from this origin is someone else's data — most importantly
  // Supabase (patient records, auth tokens, the assistant). Never touch it.
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so a deploy is picked up immediately, falling back to
  // the cached shell when offline. SPA routes resolve to index.html either way.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then(r => r ?? Response.error())),
    );
    return;
  }

  // Static build output: cache first. /assets/* filenames carry a content hash, so a
  // cached entry can never be stale — a changed file arrives under a new name.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/_ds/') || /\.(png|svg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(hit => hit ?? fetch(request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return res;
      })),
    );
  }
});
