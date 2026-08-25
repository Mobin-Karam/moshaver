(function (global) {
  "use strict";
  var filter = "all", visibleCount = 20, lastError = null;
  function esc(value) { return global.MoshaverUI.esc(value); }
  function fa(value) { return global.MoshaverUI.faNum(value); }
  function date(value) { try { return new Date(value).toLocaleString("fa-IR"); } catch (e) { return value || ""; } }
  function setOffline(offline) { var node = document.getElementById("notificationOfflineState"); if (node) node.className = offline ? "notification-offline" : "notification-offline hidden"; }
  async function render() {
    var box = document.getElementById("notificationsList"); if (!box) return;
    var rows = await global.NotificationStore.all();
    var shown = filter === "unread" ? rows.filter(function (item) { return !item.isRead; }) : rows;
    var unread = rows.filter(function (item) { return !item.isRead; }).length;
    document.getElementById("notificationUnreadText").textContent = fa(unread);
    var badge = document.getElementById("notificationBadge"); badge.textContent = fa(unread); badge.className = unread ? "badge" : "badge hidden";
    setOffline(navigator.onLine === false);
    if (lastError && navigator.onLine !== false) {
      box.innerHTML = '<div class="empty-card notification-error">دریافت اعلان‌ها انجام نشد؛ نسخه ذخیره‌شده نمایش داده می‌شود.<button id="retryNotifications" class="btn soft compact">تلاش دوباره</button></div>';
    } else box.innerHTML = "";
    if (!shown.length) {
      box.innerHTML += '<div class="empty-card">' + (navigator.onLine === false ? "آفلاین هستی؛ اعلان ذخیره‌شده‌ای وجود ندارد." : filter === "unread" ? "اعلان خوانده‌نشده‌ای نداری." : "پیام جدیدی نداری.") + "</div>";
    } else {
      box.innerHTML += shown.slice(0, visibleCount).map(function (item) {
        return '<button class="notification-item ' + (!item.isRead ? "unread" : "") + '" data-notification="' + esc(item.id) + '" data-url="' + esc(item.url || "/") + '"><span class="notification-dot"></span><span class="notification-copy"><strong>' + esc(item.title) + "</strong><p>" + esc(item.body) + "</p><small>" + esc(date(item.createdAt)) + "</small></span>" + (!item.isRead ? "<b>جدید</b>" : "") + "</button>";
      }).join("");
      if (shown.length > visibleCount) box.innerHTML += '<button id="moreNotifications" class="btn soft full">نمایش اعلان‌های بیشتر</button>';
    }
    var retry = document.getElementById("retryNotifications"); if (retry) retry.onclick = function () { open(true); };
    var more = document.getElementById("moreNotifications"); if (more) more.onclick = function () { visibleCount += 20; render(); };
    Array.prototype.forEach.call(box.querySelectorAll("[data-notification]"), function (button) {
      button.onclick = async function () {
        var id = button.getAttribute("data-notification"), url = button.getAttribute("data-url");
        await global.NotificationStore.mark(id, true); render();
        if (navigator.onLine !== false) global.API.request("PUT", "/notifications/" + encodeURIComponent(id) + "/read", {}, function (error) { if (error) global.dispatchEvent(new CustomEvent("notifications:error", { detail: error })); });
        if (url && url !== "/") global.dispatchEvent(new CustomEvent("notification:navigate", { detail: { url: url } }));
      };
    });
  }
  function open(isRetry) {
    visibleCount = 20; lastError = null;
    var box = document.getElementById("notificationsList"); if (box) box.innerHTML = '<div class="empty-card">در حال دریافت اعلان‌ها…</div>';
    render();
    global.NotificationSync.sync(true).then(render);
  }
  function setFilter(value) {
    filter = value; visibleCount = 20;
    Array.prototype.forEach.call(document.querySelectorAll("[data-notification-filter]"), function (node) { node.classList.toggle("active", node.getAttribute("data-notification-filter") === value); });
    render();
  }
  global.addEventListener("notifications:error", function (event) { lastError = event.detail || true; render(); });
  global.NotificationUI = { open: open, render: render, setFilter: setFilter };
})(window);
