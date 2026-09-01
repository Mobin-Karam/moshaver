"use strict";
const CACHE = "moshaver-admin-v2-shell-1";
const SHELL = ["/", "/admin", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => { if (event.request.method !== "GET" || new URL(event.request.url).pathname.startsWith("/api/")) return; event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); void caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))); });
self.addEventListener("push", (event) => {
  let payload = {}; try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const id = String(payload.notificationId || `notification-${Date.now()}`), url = adminUrl(payload.url);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const visible = clients.some((client) => client.visibilityState === "visible");
    if (visible) return Promise.all(clients.map((client) => client.postMessage({ type: "PUSH_RECEIVED" })));
    return self.registration.showNotification(String(payload.title || "اعلان مشاور"), { body: String(payload.body || ""), tag: id, renotify: false, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { notificationId: id, url }, vibrate: [100, 50, 100], dir: "rtl", lang: "fa" });
  }));
});
self.addEventListener("notificationclick", (event) => { event.notification.close(); const url = new URL(event.notification.data?.url || "/admin/notifications", self.location.origin); event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => { const existing = clients.find((client) => new URL(client.url).origin === url.origin); if (existing) { existing.postMessage({ type: "NOTIFICATION_CLICK", url: url.pathname + url.search }); return existing.focus(); } return self.clients.openWindow(url.href); })); });
self.addEventListener("pushsubscriptionchange", (event) => event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => clients.forEach((client) => client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" })))));
function adminUrl(value) { const url = String(value || "/"); if (url.startsWith("/admin/")) return url; if (url.startsWith("/chat") || url.startsWith("/messages")) return "/admin/chat"; if (url.startsWith("/exams")) return "/admin/exams"; if (url.startsWith("/plans") || url.startsWith("/schedule")) return "/admin/planner"; return "/admin/notifications"; }
