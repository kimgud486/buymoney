// AISTOCK 24 - PWA Service Worker Self-Cleanup for Dev & Preview
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through all requests directly to network
  return;
});
