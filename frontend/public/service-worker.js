// Service Worker — PWA Alpha Agency CRM
// Stratégie anti-cache-périmé :
//  - navigation (HTML)  = NETWORK-FIRST  -> l'app est TOUJOURS à jour (jamais d'ancienne version figée)
//  - /api/*             = NETWORK-ONLY   -> jamais de données CRM périmées
//  - /static/* (hashés) = cache-first    -> immuables (le hash change à chaque build)
// Le numéro de version ci-dessous force la réinstallation du SW et la purge de TOUS les anciens caches
// chez les visiteurs encore bloqués sur une ancienne version. Avec cette stratégie, la fraîcheur ne
// dépend plus du numéro de version : inutile de l'incrémenter à chaque déploiement.
const CACHE_NAME = 'alphagency-crm-v3-2026-06-03';
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/offline.html', '/manifest.json', '/favicon.ico'];

// Install : prend le contrôle immédiatement, pré-cache uniquement le strict minimum (pas l'app shell).
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
});

// Activate : supprime TOUS les anciens caches, puis prend la main sur les onglets ouverts.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  // API : toujours le réseau (on ne sert JAMAIS de données CRM en cache).
  if (url.pathname.startsWith('/api/')) return;

  // Navigation (pages HTML) : réseau d'abord -> nouvelle version prise en compte immédiatement.
  // Hors ligne -> page offline dédiée.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Assets hashés immuables (/static/...) : cache-first, sinon réseau (et on met en cache).
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Reste (icônes, manifest, etc.) : réseau d'abord, cache en secours.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Notifications push (inchangé)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Alpha Agency CRM', {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow((event.notification.data && event.notification.data.url) || '/'));
});
