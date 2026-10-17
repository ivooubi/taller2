// Service worker: recibe los avisos (push) aunque la web esté cerrada y los muestra como notificación.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { body: e.data ? e.data.text() : '' }; }
  const opciones = { body: d.body || '', icon: 'icon-192.png', data: { url: d.url || './' } };
  if (d.tag) { opciones.tag = d.tag; opciones.renotify = true; }   // misma conversación = se sustituye, no se acumula
  // En iPhone toda notificación push debe mostrarse (no se permiten avisos silenciosos)
  e.waitUntil(self.registration.showNotification(d.title || 'Taller Ruedas', opciones));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    for (const c of lista) if (c.url.split('?')[0] === url.split('?')[0] && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
