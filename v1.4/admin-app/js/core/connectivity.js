(function (global) {
  "use strict";

  function element() {
    return document.getElementById("apiState");
  }

  function set(status) {
    var node = element();
    if (!node) return;
    node.className = "api-state";
    if (status === "offline") {
      node.classList.add("error");
      node.textContent = "آفلاین";
      node.setAttribute("title", "اتصال شبکه در دسترس نیست");
      return;
    }
    if (status === "error") {
      node.classList.add("error");
      node.textContent = "API";
      node.setAttribute("title", "ارتباط با API با خطا روبه‌رو شد");
      return;
    }
    if (status === "syncing") {
      node.classList.add("syncing");
      node.textContent = "API …";
      node.setAttribute("title", "در حال همگام‌سازی");
      return;
    }
    node.textContent = "API ✓";
    node.setAttribute("title", "ارتباط با API برقرار است");
  }

  function syncFromBrowser() {
    if (global.navigator && global.navigator.onLine === false) set("offline");
  }

  global.MoshaverAdminConnectivity = {
    set: set,
    syncFromBrowser: syncFromBrowser,
  };
})(window);
