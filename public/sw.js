/**
 * NammaConnect Service Worker for PWA App Shell Caching.
 *
 * Enables the web application shell and offline survival kit to reopen
 * and function reliably during network outages.
 */

const CACHE_NAME = 'nammaconnect-shell-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

// Install event: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && !key.startsWith('nammaconnect-audio-cache'))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Fetch event: Network-first for dynamic APIs, Stale-while-revalidate / Cache-first for shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Do not intercept non-GET requests or browser extensions
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // Network-first for /api/ routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline and audio is in cache, return it
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          return new Response(JSON.stringify({ error: 'Offline: Network unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        })
      }),
    )
    return
  }

  // For HTML navigation: Network-first falling back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html')
      }),
    )
    return
  }

  // Stale-while-revalidate for static scripts, styles, fonts, images
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    }),
  )
})
