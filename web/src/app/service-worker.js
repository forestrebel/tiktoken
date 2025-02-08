import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { warmStrategyCache } from 'workbox-recipes'

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST)

// Cache video files
const videoStrategy = new CacheFirst({
  cacheName: 'video-cache',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200]
    }),
    new ExpirationPlugin({
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      maxEntries: 50, // Maximum number of videos to cache
      purgeOnQuotaError: true // Automatically purge if storage quota is exceeded
    })
  ]
})

registerRoute(
  ({ request }) => request.destination === 'video',
  videoStrategy
)

// Cache Supabase API responses
registerRoute(
  ({ url }) => url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL,
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60 // 24 hours
      })
    ]
  })
)

// Cache static assets
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
      })
    ]
  })
)

// Warm up the video cache with recently viewed videos
warmStrategyCache({
  urls: ['/api/recent-videos'],
  strategy: videoStrategy,
})

// Handle offline fallback
const FALLBACK_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - TikToken</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      background: #000;
      color: #fff;
    }
    h1 { margin-bottom: 10px; }
    p { color: #888; }
    button {
      margin-top: 20px;
      padding: 10px 20px;
      border: none;
      border-radius: 20px;
      background: #22c55e;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>You're Offline</h1>
  <p>Please check your internet connection</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>
`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open('offline-fallback')
      .then(cache => cache.put(
        new Request('/offline.html'),
        new Response(FALLBACK_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      ))
  )
})

// Return offline page when network fails
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => 
        caches.match('/offline.html')
      )
    )
  }
}) 