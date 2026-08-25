(function (global) {
  "use strict";
  var busy = null, lastAttempt = 0;
  function request(path) { return new Promise(function (resolve, reject) { global.API.request("GET", path, null, function (error, data) { if (error) reject(error); else resolve(data); }); }); }
  async function fetchPages() {
    var items = [], cursor = "", max = global.NotificationStore.maxItems || 150;
    do {
      var path = "/notifications?limit=50" + (cursor ? "&before=" + encodeURIComponent(cursor) : "");
      var page = await request(path), next = page && page.items ? page.items : (Array.isArray(page) ? page : []);
      items = items.concat(next);
      cursor = page && page.hasMore && page.nextCursor ? page.nextCursor : "";
    } while (cursor && items.length < max);
    items = items.slice(0, max);
    return { items: items, cursor: items.length ? String(items[0].createdAt || "") + "|" + String(items[0].id || "") : "" };
  }
  function sync(force) {
    if (busy) return busy;
    if (navigator.onLine === false || (!force && Date.now() - lastAttempt < 15000)) return global.NotificationStore.all();
    lastAttempt = Date.now();
    busy = fetchPages().then(function (result) {
      return global.NotificationStore.put(result.items).then(function () { return global.NotificationStore.meta("lastSyncCursor", result.cursor); }).then(function () { return global.NotificationStore.meta("lastSync", new Date().toISOString()); });
    }).then(function () {
      global.dispatchEvent(new CustomEvent("notifications:updated", { detail: { online: true } }));
      return global.NotificationStore.all();
    }).catch(function (error) {
      global.dispatchEvent(new CustomEvent("notifications:error", { detail: error }));
      return global.NotificationStore.all();
    }).then(function (rows) { busy = null; return rows; }, function (error) { busy = null; throw error; });
    return busy;
  }
  global.NotificationSync = { sync: sync };
})(window);
