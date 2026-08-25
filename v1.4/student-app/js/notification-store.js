(function (global) {
  "use strict";
  var VERSION = 1, MAX_ITEMS = 150, owner = "anonymous";
  function safeOwner(value) { return String(value || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80); }
  function dbName() { return "moshaver-notifications-" + owner; }
  function localKey(suffix) { return "moshaver_notification_cache:" + owner + (suffix ? ":" + suffix : ""); }
  function configure(ownerId) { owner = safeOwner(ownerId); }
  function fallbackRead() { try { return JSON.parse(localStorage.getItem(localKey()) || "[]"); } catch (e) { return []; } }
  function fallbackWrite(rows) { try { localStorage.setItem(localKey(), JSON.stringify(rows.slice(0, MAX_ITEMS))); } catch (e) {} }
  function open() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) return reject(new Error("IndexedDB unavailable"));
      var request = indexedDB.open(dbName(), VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains("notifications")) {
          var store = db.createObjectStore("notifications", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }
  function transaction(mode, work) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(["notifications", "meta"], mode);
        work(tx.objectStore("notifications"), tx.objectStore("meta"));
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
        tx.onabort = function () { db.close(); reject(tx.error || new Error("IndexedDB transaction aborted")); };
      });
    });
  }
  function sortNewest(a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || String(b.id || "").localeCompare(String(a.id || "")); }
  function all() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var request = db.transaction("notifications").objectStore("notifications").getAll();
        request.onsuccess = function () { db.close(); resolve((request.result || []).sort(sortNewest).slice(0, MAX_ITEMS)); };
        request.onerror = function () { db.close(); reject(request.error); };
      });
    }).catch(function () { return fallbackRead().sort(sortNewest).slice(0, MAX_ITEMS); });
  }
  function trim() {
    return all().then(function (rows) {
      if (rows.length <= MAX_ITEMS) return;
      var keep = {}; rows.slice(0, MAX_ITEMS).forEach(function (item) { keep[item.id] = true; });
      return transaction("readwrite", function (store) {
        var cursor = store.openCursor();
        cursor.onsuccess = function () { var current = cursor.result; if (!current) return; if (!keep[current.key]) current.delete(); current.continue(); };
      });
    });
  }
  function put(items) {
    items = items || [];
    return transaction("readwrite", function (store) { items.forEach(function (item) { if (item && item.id) store.put(item); }); })
      .then(trim).catch(function () {
        var byId = {}; fallbackRead().concat(items).forEach(function (item) { if (item && item.id) byId[item.id] = item; });
        fallbackWrite(Object.keys(byId).map(function (id) { return byId[id]; }).sort(sortNewest));
      });
  }
  function updateRead(id, value) { return all().then(function (rows) { rows.forEach(function (item) { if (!id || item.id === id) item.isRead = value; }); return put(rows); }); }
  function meta(key, value) {
    if (arguments.length > 1) return transaction("readwrite", function (store, metas) { metas.put({ key: key, value: value }); }).catch(function () { try { localStorage.setItem(localKey(key), JSON.stringify(value)); } catch (e) {} });
    return open().then(function (db) { return new Promise(function (resolve) { var request = db.transaction("meta").objectStore("meta").get(key); request.onsuccess = function () { db.close(); resolve(request.result ? request.result.value : null); }; request.onerror = function () { db.close(); resolve(null); }; }); })
      .catch(function () { try { return JSON.parse(localStorage.getItem(localKey(key)) || "null"); } catch (e) { return null; } });
  }
  global.NotificationStore = { configure: configure, put: put, all: all, mark: function (id, read) { return updateRead(id, read); }, markAll: function (read) { return updateRead(null, read); }, meta: meta, maxItems: MAX_ITEMS };
})(window);
