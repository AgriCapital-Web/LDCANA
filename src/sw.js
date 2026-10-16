import { precacheAndRoute } from 'workbox-precaching';

// Keep the service worker for push notifications, but do not cache app assets or API data.
precacheAndRoute(self.__WB_MANIFEST.filter(() => false));

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || '' }; }
  const title = data.title || 'Les Délices de CANA';
  const options = {
    body: data.body || 'Nouvelle information du restaurant.',
    icon: '/api/cana-logo',
    badge: '/api/cana-logo',
    tag: data.tag || 'cana-notification',
    renotify: false,
    data: { url: data.url || '/', eventKey: data.tag || 'cana-notification' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/me';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) if ('focus' in client) { client.navigate(url); return client.focus(); }
    return clients.openWindow(url);
  }));
});