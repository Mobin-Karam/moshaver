(function (global) {
  "use strict";

  var timers = {};

  function esc(value) {
    if (global.MoshaverUI && global.MoshaverUI.esc) return global.MoshaverUI.esc(value);
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function key(id, name) {
    return "list_" + id + "_" + name;
  }

  function read(id, defaults) {
    var params = new URLSearchParams(global.location.search);
    var result = {};
    defaults = defaults || {};
    Object.keys(defaults).forEach(function (name) {
      result[name] = params.has(key(id, name)) ? params.get(key(id, name)) : defaults[name];
    });
    return result;
  }

  function write(id, state) {
    var url = new URL(global.location.href);
    Object.keys(state || {}).forEach(function (name) {
      var value = state[name];
      if (value === "" || value === "all" || value == null) url.searchParams.delete(key(id, name));
      else url.searchParams.set(key(id, name), value);
    });
    global.history.replaceState(global.history.state, "", url.pathname + url.search + url.hash);
  }

  function debounce(id, callback, delay) {
    global.clearTimeout(timers[id]);
    timers[id] = global.setTimeout(callback, delay || 220);
  }

  function skeleton(rows) {
    var html = '<div class="list-state list-skeleton" role="status" aria-label="در حال بارگذاری">';
    for (var i = 0; i < (rows || 5); i++) html += '<span class="skeleton-row"><i></i><i></i><i></i></span>';
    return html + "</div>";
  }

  function empty(options) {
    options = options || {};
    return '<div class="list-state list-empty"><strong>' + esc(options.title || "موردی پیدا نشد") + '</strong><p>' +
      esc(options.message || (options.filtered ? "فیلترها را تغییر دهید یا پاک کنید." : "هنوز داده‌ای برای نمایش وجود ندارد.")) + "</p>" +
      (options.actionId ? '<button id="' + esc(options.actionId) + '" class="btn soft" type="button">' + esc(options.actionLabel || "اقدام") + "</button>" : "") +
      "</div>";
  }

  function error(message, retryId) {
    return '<div class="list-state list-error" role="alert"><strong>دریافت اطلاعات ناموفق بود</strong><p>' + esc(message || "ارتباط با سرور برقرار نشد.") + '</p><button id="' + esc(retryId) + '" class="btn soft" type="button">تلاش دوباره</button></div>';
  }

  function offline(lastSync) {
    return '<div class="list-offline" role="status">آفلاین' + (lastSync ? "، آخرین همگام‌سازی " + esc(lastSync) : "") + "</div>";
  }

  function toolbar(options) {
    options = options || {};
    var filters = options.filters || [];
    var html = '<div class="list-toolbar" data-list-toolbar="' + esc(options.id) + '"><label class="list-search"><span class="sr-only">جستجو</span><input type="search" data-list-search placeholder="' + esc(options.placeholder || "جستجو...") + '" value="' + esc(options.q || "") + '"></label>';
    filters.forEach(function (filter) {
      html += '<label><span class="sr-only">' + esc(filter.label || filter.name) + '</span><select data-list-filter="' + esc(filter.name) + '">';
      (filter.options || []).forEach(function (option) {
        html += '<option value="' + esc(option.value) + '"' + (String(option.value) === String(filter.value) ? " selected" : "") + ">" + esc(option.label) + "</option>";
      });
      html += "</select></label>";
    });
    html += '<span class="list-result-count" aria-live="polite">' + esc(options.countText || "") + '</span><button class="mini-btn" type="button" data-list-reset>پاک‌کردن</button><button class="mini-btn" type="button" data-list-refresh>تازه‌سازی</button></div>';
    return html;
  }

  function bind(root, options) {
    if (!root || !options) return;
    var search = root.querySelector("[data-list-search]");
    if (search) search.oninput = function () {
      var value = this.value;
      debounce((options.id || "list") + "-search", function () { options.onChange("q", value); });
    };
    Array.prototype.forEach.call(root.querySelectorAll("[data-list-filter]"), function (select) {
      select.onchange = function () { options.onChange(this.getAttribute("data-list-filter"), this.value); };
    });
    var reset = root.querySelector("[data-list-reset]");
    if (reset) reset.onclick = options.onReset;
    var refresh = root.querySelector("[data-list-refresh]");
    if (refresh) refresh.onclick = options.onRefresh;
  }

  function actions(label, items) {
    var html = '<details class="list-actions"><summary aria-label="' + esc(label || "عملیات") + '">•••</summary><div role="menu">';
    (items || []).forEach(function (item) {
      html += '<button type="button" role="menuitem" ' + item.attr + '="' + esc(item.value) + '"' + (item.danger ? ' class="danger-text"' : "") + ">" + esc(item.label) + "</button>";
    });
    return html + "</div></details>";
  }

  global.MoshaverAdminList = { read: read, write: write, debounce: debounce, skeleton: skeleton, empty: empty, error: error, offline: offline, toolbar: toolbar, bind: bind, actions: actions };
})(window);
