(function (global) {
  "use strict";

  function create(deps) {
    var api = deps.api;
    var el = deps.el;
    var qa = deps.qa;
    var esc = deps.esc;
    var fa = deps.fa;
    var toast = deps.toast;
    var openModal = deps.openModal;
    var closeModal = deps.closeModal;
    var List = global.MoshaverAdminList;
    var imports = [];
    var releases = [];
    var sessions = [];
    var importState = List.read("imports", { q: "", publish: "all", sort: "newest" });
    var releaseState = List.read("releases", { q: "", sort: "newest" });

    function size(n) {
      n = Number(n || 0);
      return n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB";
    }

    function loadHealth() {
      api("GET", "/admin/system/database", null, function (err, data) {
        if (err || !el("systemHealthGrid")) return;
        el("systemHealthGrid").innerHTML =
          '<article class="live-context-card"><small>پایگاه داده</small><strong>' + esc(data.status === "healthy" ? "سالم" : "نیازمند بررسی") + "</strong><span>" + esc(data.engine || "sqlite") + " • " + size(data.sizeBytes) + "</span></article>" +
          '<article class="live-context-card"><small>نسخه سرویس</small><strong>' + esc(data.version || "—") + "</strong><span>" + esc(data.environment || "—") + "</span></article>" +
          '<article class="live-context-card"><small>نشست‌های فعال</small><strong>' + fa(data.activeSessions || 0) + "</strong><span>" + fa(data.realtimeConnections || 0) + " اتصال زنده</span></article>" +
          '<article class="live-context-card"><small>آخرین پشتیبان</small><strong>' + esc(data.lastBackupAt ? new Date(data.lastBackupAt).toLocaleString("fa-IR") : "هنوز ساخته نشده") + "</strong><span>زمان کارکرد " + fa(Math.round(Number(data.uptimeSeconds || 0) / 60)) + " دقیقه</span></article>";
      });
    }

    function downloadBackup() {
      var button = el("downloadBackupBtn"), status = el("backupStatus"), xhr = new XMLHttpRequest();
      button.disabled = true; status.textContent = "در حال ساخت snapshot امن…";
      xhr.open("POST", global.API.base() + "/admin/system/database-backup", true); xhr.responseType = "blob"; xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/json"); xhr.setRequestHeader("X-CSRF-Token", global.API.csrf());
      xhr.onload = function () { button.disabled = false; if (xhr.status !== 200) { status.textContent = "ساخت پشتیبان ناموفق بود."; return toast("دانلود پشتیبان ناموفق بود", "error"); } var disposition = xhr.getResponseHeader("Content-Disposition") || "", match = /filename="([^"]+)"/.exec(disposition), name = match ? match[1] : "moshaver-backup.sqlite", url = URL.createObjectURL(xhr.response), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); status.textContent = "پشتیبان سالم دانلود شد: " + name; toast("پشتیبان پایگاه داده دانلود شد"); loadHealth(); };
      xhr.onerror = function () { button.disabled = false; status.textContent = "ارتباط با سرور قطع شد."; toast("دانلود پشتیبان ناموفق بود", "error"); }; xhr.send("{}");
    }

    function restoreBackup() {
      var input = el("restoreBackupFile"), button = el("restoreBackupBtn"), status = el("backupStatus");
      var file = input && input.files && input.files[0];
      if (!file) return toast("فایل پشتیبان را انتخاب کنید.", "error");
      if (!/\.(sqlite|db)$/i.test(file.name) && file.type && ["application/vnd.sqlite3", "application/x-sqlite3", "application/octet-stream"].indexOf(file.type) < 0) return toast("فرمت فایل پشتیبان معتبر نیست.", "error");
      if (!confirm("بازیابی پشتیبان، داده‌های فعلی این نصب را با فایل انتخاب‌شده جایگزین می‌کند. ادامه می‌دهید؟")) return;
      var xhr = new XMLHttpRequest();
      button.disabled = true;
      status.textContent = "در حال بارگذاری و اعتبارسنجی پشتیبان…";
      xhr.open("POST", global.API.base() + "/admin/system/database-restore", true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/vnd.sqlite3");
      xhr.setRequestHeader("X-CSRF-Token", global.API.csrf());
      xhr.onload = function () {
        button.disabled = false;
        var payload = null;
        try { payload = JSON.parse(xhr.responseText || "{}"); } catch (error) {}
        if (xhr.status < 200 || xhr.status >= 300 || !payload || !payload.ok) {
          status.textContent = "بازیابی پشتیبان ناموفق بود.";
          return toast(payload && payload.error ? payload.error.message : "بازیابی انجام نشد.", "error");
        }
        var data = payload.data || {};
        status.textContent = "پشتیبان بازیابی شد. سرور در حال راه‌اندازی دوباره است. چند ثانیه بعد صفحه را تازه کنید. تعداد جدول‌ها: " + fa(data.tables || 0);
        toast("بازیابی انجام شد؛ سرور دوباره راه‌اندازی می‌شود.");
      };
      xhr.onerror = function () {
        button.disabled = false;
        status.textContent = "ارتباط هنگام بارگذاری پشتیبان قطع شد.";
        toast("بازیابی پشتیبان ناموفق بود", "error");
      };
      xhr.send(file);
    }

    function renderSessions() {
      var html = "";
      for (var i = 0; i < sessions.length; i++) {
        var session = sessions[i];
        var userAgent = String(session.userAgent || "").slice(0, 75);
        html += '<div class="session-row table-row" data-list-row><div><strong>' + (session.current ? "نشست فعلی" : "نشست فعال") + "</strong><small>" + esc(session.ipAddress || "IP نامشخص") + " • " + esc(userAgent || "مرورگر نامشخص") + "</small><small>آخرین فعالیت: " + esc(session.lastSeenAt || "—") + "</small></div>" + (session.current ? '<span class="tag">فعلی</span>' : List.actions("عملیات نشست", [{ label: "خروج این نشست", attr: "data-revoke-session", value: session.id, danger: true }])) + "</div>";
      }
      el("sessionList").innerHTML = '<div class="list-result-count">' + fa(sessions.length) + " نشست</div>" + (html || List.empty({ title: "نشستی پیدا نشد" }));
      var buttons = qa("[data-revoke-session]");
      for (i = 0; i < buttons.length; i++) {
        buttons[i].onclick = function () {
          var id = this.getAttribute("data-revoke-session");
          if (!confirm("این نشست بسته شود؟")) return;
          api("DELETE", "/auth/sessions/" + encodeURIComponent(id), null, function (revokeErr) {
            if (revokeErr) return toast(revokeErr.message);
            toast("نشست بسته شد");
            loadSessions();
          });
        };
      }
    }

    function loadSessions() {
      el("sessionList").innerHTML = List.skeleton(3);
      api("GET", "/auth/sessions", null, function (err, data) {
        if (err) {
          el("sessionList").innerHTML = List.error(err.message, "retrySessions");
          el("retrySessions").onclick = loadSessions;
          return;
        }
        sessions = data || [];
        renderSessions();
      });
    }

    function renderImports() {
      var query = String(importState.q || "").trim().toLowerCase();
      var filtered = imports.filter(function (item) {
        var matchesQuery = !query || [item.source_name, item.created_at, item.plan_count, item.exam_count].join(" ").toLowerCase().indexOf(query) >= 0;
        var matchesPublish = importState.publish === "all" || (importState.publish === "published" ? item.published : !item.published);
        return matchesQuery && matchesPublish;
      });
      filtered.sort(function (a, b) {
        var order = String(a.created_at || "").localeCompare(String(b.created_at || ""));
        return importState.sort === "oldest" ? order : -order;
      });
      var html = List.toolbar({ id: "imports", q: importState.q, placeholder: "جستجو در ورودی‌های JSON...", countText: fa(filtered.length) + " ورودی", filters: [{ name: "publish", label: "انتشار", value: importState.publish, options: [{ value: "all", label: "همه" }, { value: "published", label: "منتشر" }, { value: "draft", label: "پیش‌نویس" }] }, { name: "sort", label: "مرتب‌سازی", value: importState.sort, options: [{ value: "newest", label: "جدیدترین" }, { value: "oldest", label: "قدیمی‌ترین" }] }] });
      html += navigator.onLine ? "" : List.offline();
      html += '<div class="responsive-list">';
      for (var i = 0; i < filtered.length; i++) {
        var item = filtered[i];
        html += '<div class="inbox-item table-row" data-list-row><div><strong>' + esc(item.source_name || "JSON import") + "</strong><p>" + fa(item.plan_count) + " برنامه • " + fa(item.task_count) + " فعالیت • " + fa(item.exam_count) + " آزمون</p><small>" + esc(item.created_at) + '</small></div><span class="tag ' + (item.published ? "" : "warn") + '">' + (item.published ? "منتشر" : "پیش‌نویس") + "</span></div>";
      }
      html += "</div>";
      if (!filtered.length) html += List.empty({ filtered: !!query || importState.publish !== "all", title: "ورودی JSON پیدا نشد" });
      el("importHistory").innerHTML = html;
      List.bind(el("importHistory"), { id: "imports", onChange: function (name, value) { importState[name] = value; List.write("imports", importState); renderImports(); }, onReset: function () { importState = { q: "", publish: "all", sort: "newest" }; List.write("imports", importState); renderImports(); }, onRefresh: loadImports });
    }

    function renderReleases() {
      var query = String(releaseState.q || "").trim().toLowerCase();
      var filtered = releases.filter(function (release) { return !query || [release.app_name, release.version, release.notes].join(" ").toLowerCase().indexOf(query) >= 0; });
      filtered.sort(function (a, b) {
        var order = String(a.created_at || a.version || "").localeCompare(String(b.created_at || b.version || ""));
        return releaseState.sort === "oldest" ? order : -order;
      });
      var html = List.toolbar({ id: "releases", q: releaseState.q, placeholder: "جستجو نسخه...", countText: fa(filtered.length) + " نسخه", filters: [{ name: "sort", label: "مرتب‌سازی", value: releaseState.sort, options: [{ value: "newest", label: "جدیدترین" }, { value: "oldest", label: "قدیمی‌ترین" }] }] });
      html += '<div class="responsive-list">';
      for (var i = 0; i < filtered.length; i++) {
        var release = filtered[i];
        html += '<div class="inbox-item table-row" data-list-row><div><strong>' + esc(release.app_name) + " " + esc(release.version) + "</strong><p>" + esc(release.notes || "") + "</p></div></div>";
      }
      html += "</div>";
      if (!filtered.length) html += List.empty({ filtered: !!query, title: "نسخه‌ای پیدا نشد" });
      el("releaseList").innerHTML = html;
      List.bind(el("releaseList"), { id: "releases", onChange: function (name, value) { releaseState[name] = value; List.write("releases", releaseState); renderReleases(); }, onReset: function () { releaseState = { q: "", sort: "newest" }; List.write("releases", releaseState); renderReleases(); }, onRefresh: loadReleases });
    }

    function loadImports() {
      el("importHistory").innerHTML = List.skeleton(4);
      api("GET", "/admin/import/history", null, function (err, data) {
        if (err) { el("importHistory").innerHTML = List.error(err.message, "retryImports"); el("retryImports").onclick = loadImports; return; }
        imports = data || [];
        renderImports();
      });
    }

    function loadReleases() {
      el("releaseList").innerHTML = List.skeleton(3);
      api("GET", "/admin/app-releases", null, function (err, data) {
        if (err) { el("releaseList").innerHTML = List.error(err.message, "retryReleases"); el("retryReleases").onclick = loadReleases; return; }
        releases = data || [];
        renderReleases();
      });
    }

    function load() {
      loadImports();
      loadReleases();
      loadSessions();
      loadHealth();
    }

    function openChangePassword() {
      openModal('<span class="eyebrow">SECURITY</span><h2>تغییر رمز عبور</h2><label>رمز فعلی<input id="currentPassword" type="password" autocomplete="current-password"></label><label>رمز جدید<input id="newPassword" type="password" minlength="12" autocomplete="new-password"></label><label>تکرار رمز جدید<input id="newPassword2" type="password" minlength="12" autocomplete="new-password"></label><p>حداقل ۱۲ نویسه؛ بعد از تغییر، سایر نشست‌های حساب بسته می‌شوند.</p><button id="savePassword" class="btn primary full">تغییر رمز</button>');
      el("savePassword").onclick = function () {
        var password = el("newPassword").value;
        var repeated = el("newPassword2").value;
        if (password !== repeated) return toast("تکرار رمز با رمز جدید یکسان نیست.");
        api("POST", "/auth/change-password", { currentPassword: el("currentPassword").value, newPassword: password }, function (err) {
          if (err) return toast(err.message);
          closeModal();
          toast("رمز تغییر کرد و نشست‌های دیگر بسته شدند.");
          loadSessions();
        });
      };
    }

    return { load: load, loadSessions: loadSessions, openChangePassword: openChangePassword, downloadBackup: downloadBackup, restoreBackup: restoreBackup };
  }

  global.MoshaverAdminSystem = { create: create };
})(window);
