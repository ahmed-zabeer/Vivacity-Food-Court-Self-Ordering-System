// Service Worker for Vivacity Food Court
// Handles Web Push and Lock-Screen Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Food Ready!',
      body: event.data ? event.data.text() : 'Your food is ready for pickup/delivery.'
    };
  }

  const title = data.title || 'Food Ready — Vivacity Food Court';
  const options = {
    body: data.body || 'Your delicious meal is freshly prepared and ready.',
    icon: '/assets/vivacity-chili-icon.png',
    badge: '/assets/vivacity-chili-icon.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || 'food-ready',
    renotify: true,
    requireInteraction: true, // Remains on lock screen / system tray until dismissed/opened
    data: {
      url: data.url || (data.orderId ? `/orders/${data.orderId}` : '/orders'),
      orderId: data.orderId,
      stallId: data.stallId,
      notificationEventId: data.notificationEventId
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'Food Ready — Vivacity Food Court';
    const options = {
      body: event.data.options?.body || 'Your meal is ready!',
      icon: event.data.options?.icon || '/assets/vivacity-chili-icon.png',
      badge: '/assets/vivacity-chili-icon.png',
      vibrate: [300, 100, 300, 100, 300],
      tag: event.data.options?.tag || 'food-ready',
      renotify: true,
      requireInteraction: true,
      data: event.data.options?.data || { url: '/' }
    };
    self.registration.showNotification(title, options);
  }
});
