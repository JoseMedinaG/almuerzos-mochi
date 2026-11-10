/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string } = {
    title: "lunchppy",
    body: "¡Nuevo menú disponible!",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        data = { title: parsed.title ?? data.title, body: parsed.body ?? data.body };
      }
    }
  } catch {
    try {
      if (event.data) data.body = event.data.text();
    } catch {
      // ignore
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title!, {
      body: data.body,
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
    } as NotificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/") && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow("/");
      })
  );
});
