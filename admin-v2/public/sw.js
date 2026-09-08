"use strict";

/**
 * Moshaver Admin V2 Service Worker
 * Handles:
 * - App-shell caching
 * - Offline fallback
 * - Safe runtime caching
 * - Push notifications
 * - Notification navigation
 * - Push subscription changes
 * - Service-worker lifecycle updates
 */

const CACHE_VERSION = "2";
const CACHE_PREFIX = "moshaver-admin-v2";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

const DEFAULT_ADMIN_URL = "/admin/notifications";
const OFFLINE_FALLBACK = "/";

const SHELL = [
  "/",
  "/admin",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

/* -------------------------------------------------------------------------- */
/*                                   INSTALL                                  */
/* -------------------------------------------------------------------------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      /**
       * Do not use cache.addAll() here.
       *
       * If a single optional icon/manifest is missing,
       * addAll() rejects and the entire service-worker installation fails.
       */
      await Promise.allSettled(
        SHELL.map(async (url) => {
          try {
            const response = await fetch(url, {
              cache: "no-cache",
            });

            if (!response.ok) {
              return;
            }

            await cache.put(url, response);
          } catch {
            // One failed shell resource must not break SW installation.
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

/* -------------------------------------------------------------------------- */
/*                                  ACTIVATE                                  */
/* -------------------------------------------------------------------------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const allowedCaches = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith(CACHE_PREFIX) && !allowedCaches.has(key),
          )
          .map((key) => caches.delete(key)),
      );

      if ("navigationPreload" in self.registration) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          // Navigation preload is optional.
        }
      }

      await self.clients.claim();
    })(),
  );
});

/* -------------------------------------------------------------------------- */
/*                                    FETCH                                   */
/* -------------------------------------------------------------------------- */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  let url;

  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Service worker should only cache HTTP(S).
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  /**
   * Never cache API traffic.
   *
   * Authentication/session based responses must always come directly
   * from the backend.
   */
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return;
  }

  // Don't interfere with browser range requests.
  if (request.headers.has("range")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  /**
   * Runtime caching is deliberately restricted to same-origin assets.
   * This avoids accidentally caching third-party authenticated resources.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(handleAssetRequest(request));
});

/**
 * Network-first navigation.
 *
 * Admin pages should prefer the newest frontend bundle, but previously
 * cached content is available when the network is unavailable.
 */
async function handleNavigationRequest(event) {
  const request = event.request;

  try {
    const preloadResponse = await event.preloadResponse;

    if (preloadResponse) {
      if (isCacheableResponse(preloadResponse)) {
        void putRuntimeCache(request, preloadResponse.clone());
      }

      return preloadResponse;
    }

    const response = await fetch(request);

    if (isCacheableResponse(response)) {
      void putRuntimeCache(request, response.clone());
    }

    return response;
  } catch {
    const cachedRequest = await caches.match(request);

    if (cachedRequest) {
      return cachedRequest;
    }

    const adminShell = await caches.match("/admin");

    if (adminShell) {
      return adminShell;
    }

    const fallback = await caches.match(OFFLINE_FALLBACK);

    if (fallback) {
      return fallback;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

/**
 * Stale-while-revalidate for static application resources.
 */
async function handleAssetRequest(request) {
  const cached = await caches.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        await putRuntimeCache(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  if (cached) {
    void networkPromise;
    return cached;
  }

  const networkResponse = await networkPromise;

  if (networkResponse) {
    return networkResponse;
  }

  return new Response("", {
    status: 504,
    statusText: "Gateway Timeout",
  });
}

function isCacheableResponse(response) {
  if (!response) {
    return false;
  }

  if (!response.ok) {
    return false;
  }

  return response.type === "basic" || response.type === "cors";
}

async function putRuntimeCache(request, response) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response);
  } catch {
    // Runtime cache failure should never break the application request.
  }
}

/* -------------------------------------------------------------------------- */
/*                                     PUSH                                   */
/* -------------------------------------------------------------------------- */

self.addEventListener("push", (event) => {
  event.waitUntil(handlePushEvent(event));
});

async function handlePushEvent(event) {
  const payload = readPushPayload(event);

  const notificationId = String(
    payload.notificationId || payload.id || `notification-${Date.now()}`,
  );

  const url = adminUrl(
    payload.url || payload.link || payload.href || DEFAULT_ADMIN_URL,
  );

  const title = String(
    payload.title || payload.notification?.title || "اعلان مشاور",
  );

  const body = String(
    payload.body || payload.message || payload.notification?.body || "",
  );

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  /**
   * Tell all open tabs about the notification.
   *
   * React Query / notification state can then invalidate its notification
   * query without waiting for the user to reload.
   */
  await Promise.allSettled(
    clients.map((client) =>
      client.postMessage({
        type: "PUSH_RECEIVED",
        notificationId,
        url,
        payload,
      }),
    ),
  );

  const visibleClient = clients.some(
    (client) => client.visibilityState === "visible",
  );

  /**
   * When the admin application is already visible we let the in-app
   * notification UI handle the event instead of creating a duplicate
   * operating-system notification.
   */
  if (visibleClient) {
    return;
  }

  const options = {
    body,
    tag: notificationId,

    /**
     * Prevent the same notification ID from producing multiple stacked
     * system notifications.
     */
    renotify: false,

    icon: safeString(payload.icon) || "/icons/icon-192.png",
    badge: safeString(payload.badge) || "/icons/icon-192.png",

    dir: payload.dir === "ltr" ? "ltr" : "rtl",
    lang: safeString(payload.lang) || "fa",

    data: {
      notificationId,
      url,
      payload,
    },

    timestamp:
      typeof payload.timestamp === "number" ? payload.timestamp : Date.now(),

    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
  };

  /**
   * `vibrate` is not supported consistently on every browser.
   */
  if (!options.silent) {
    options.vibrate = Array.isArray(payload.vibrate)
      ? payload.vibrate
      : [100, 50, 100];
  }

  /**
   * Optional notification actions.
   */
  if (Array.isArray(payload.actions)) {
    options.actions = payload.actions
      .filter(
        (action) =>
          action &&
          typeof action.action === "string" &&
          typeof action.title === "string",
      )
      .slice(0, 2)
      .map((action) => ({
        action: action.action,
        title: action.title,
        ...(action.icon ? { icon: String(action.icon) } : {}),
      }));
  }

  await self.registration.showNotification(title, options);
}

/* -------------------------------------------------------------------------- */
/*                           PUSH PAYLOAD PARSING                             */
/* -------------------------------------------------------------------------- */

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    const json = event.data.json();

    if (json && typeof json === "object") {
      return json;
    }
  } catch {
    // Try text format below.
  }

  try {
    const text = event.data.text();

    if (!text) {
      return {};
    }

    return {
      body: text,
    };
  } catch {
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/*                            NOTIFICATION CLICK                              */
/* -------------------------------------------------------------------------- */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(handleNotificationClick(event));
});

async function handleNotificationClick(event) {
  const notificationData = event.notification?.data || {};

  const destination = adminUrl(notificationData.url || DEFAULT_ADMIN_URL);

  const destinationUrl = new URL(destination, self.location.origin);

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  /**
   * Prefer an already-open instance of this application.
   */
  const existingClient =
    clients.find((client) => {
      try {
        return (
          new URL(client.url).origin === self.location.origin &&
          client.visibilityState === "visible"
        );
      } catch {
        return false;
      }
    }) ||
    clients.find((client) => {
      try {
        return new URL(client.url).origin === self.location.origin;
      } catch {
        return false;
      }
    });

  if (existingClient) {
    const relativeUrl =
      destinationUrl.pathname + destinationUrl.search + destinationUrl.hash;

    /**
     * Allow the React app to handle navigation itself if it listens for
     * service-worker messages.
     */
    existingClient.postMessage({
      type: "NOTIFICATION_CLICK",
      notificationId: notificationData.notificationId || null,
      url: relativeUrl,
      action: event.action || null,
    });

    /**
     * client.navigate() gives correct behavior even when the app does not
     * yet implement the NOTIFICATION_CLICK message handler.
     */
    try {
      if ("navigate" in existingClient) {
        await existingClient.navigate(destinationUrl.href);
      }
    } catch {
      // The postMessage handler may still perform SPA navigation.
    }

    try {
      await existingClient.focus();
    } catch {
      // Focusing is best-effort.
    }

    return;
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(destinationUrl.href);
  }
}

/* -------------------------------------------------------------------------- */
/*                           NOTIFICATION CLOSE                               */
/* -------------------------------------------------------------------------- */

self.addEventListener("notificationclose", (event) => {
  const data = event.notification?.data || {};

  event.waitUntil(
    notifyApplicationClients({
      type: "NOTIFICATION_CLOSED",
      notificationId: data.notificationId || null,
    }),
  );
});

/* -------------------------------------------------------------------------- */
/*                        PUSH SUBSCRIPTION CHANGE                            */
/* -------------------------------------------------------------------------- */

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    notifyApplicationClients({
      type: "PUSH_SUBSCRIPTION_CHANGED",
    }),
  );
});

/* -------------------------------------------------------------------------- */
/*                              APP MESSAGING                                 */
/* -------------------------------------------------------------------------- */

self.addEventListener("message", (event) => {
  const message = event.data;

  if (!message || typeof message !== "object") {
    return;
  }

  switch (message.type) {
    case "SKIP_WAITING":
      void self.skipWaiting();
      break;

    case "CLEAR_NOTIFICATION_CACHE":
      event.waitUntil(clearRuntimeCache());
      break;

    case "GET_SW_VERSION":
      if (event.source) {
        event.source.postMessage({
          type: "SW_VERSION",
          version: CACHE_VERSION,
          shellCache: SHELL_CACHE,
          runtimeCache: RUNTIME_CACHE,
        });
      }
      break;

    default:
      break;
  }
});

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

async function notifyApplicationClients(message) {
  try {
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    await Promise.allSettled(
      clients.map((client) => client.postMessage(message)),
    );
  } catch {
    // Messaging failure must not crash the service worker.
  }
}

async function clearRuntimeCache() {
  try {
    await caches.delete(RUNTIME_CACHE);
  } catch {
    // Ignore cache deletion failure.
  }
}

/**
 * Converts notification destinations into known Admin V2 routes.
 *
 * Important:
 * - External URLs are never allowed.
 * - API URLs are never opened.
 * - Unknown frontend paths fall back to notifications.
 */
function adminUrl(value) {
  const fallback = DEFAULT_ADMIN_URL;

  if (typeof value !== "string") {
    return fallback;
  }

  const raw = value.trim();

  if (!raw) {
    return fallback;
  }

  let parsed;

  try {
    parsed = new URL(raw, self.location.origin);
  } catch {
    return fallback;
  }

  /**
   * Never allow a push notification to redirect the admin to another
   * origin.
   */
  if (parsed.origin !== self.location.origin) {
    return fallback;
  }

  const pathname = normalizePath(parsed.pathname);

  if (pathname.startsWith("/api/")) {
    return fallback;
  }

  let destination;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    destination = pathname;
  } else if (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/conversation") ||
    pathname.startsWith("/conversations")
  ) {
    destination = "/admin/chat";
  } else if (pathname.startsWith("/exams") || pathname.startsWith("/exam")) {
    destination = "/admin/exams";
  } else if (
    pathname.startsWith("/plans") ||
    pathname.startsWith("/plan") ||
    pathname.startsWith("/planner") ||
    pathname.startsWith("/schedule")
  ) {
    destination = "/admin/planner";
  } else if (
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/notification")
  ) {
    destination = "/admin/notifications";
  } else if (
    pathname.startsWith("/students") ||
    pathname.startsWith("/student")
  ) {
    destination = pathname.startsWith("/admin/")
      ? pathname
      : `/admin${pathname}`;
  } else if (
    pathname.startsWith("/reports") ||
    pathname.startsWith("/report")
  ) {
    destination = pathname.startsWith("/admin/")
      ? pathname
      : `/admin${pathname}`;
  } else {
    destination = fallback;
  }

  /**
   * Preserve query parameters and hashes only for routes that are already
   * inside /admin. This allows links such as:
   *
   * /admin/chat?conversation=123
   */
  if (pathname.startsWith("/admin/")) {
    return destination + parsed.search + parsed.hash;
  }

  return destination;
}

function normalizePath(pathname) {
  if (!pathname) {
    return "/";
  }

  let path = pathname;

  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Keep original encoded pathname.
  }

  path = path.replace(/\/{2,}/g, "/");

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return path;
}

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}
