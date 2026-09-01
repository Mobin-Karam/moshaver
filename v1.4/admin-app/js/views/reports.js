(function (global) {
  "use strict";

  function create(deps) {
    var state = deps.state;
    var api = deps.api;
    var el = deps.el;
    var esc = deps.esc;
    var fa = deps.fa;
    var List = global.MoshaverAdminList;
    var reports = [];
    var listState = List.read("reports", { q: "", sort: "newest" });
    var visible = 20;

    function applyFilters() {
      var query = String(listState.q || "").trim().toLowerCase();
      var filtered = reports.filter(function (report) {
        return !query || [report.plan_date, report.problem, report.study_hours, report.tests, report.focus, report.fatigue, report.motivation].join(" ").toLowerCase().indexOf(query) >= 0;
      });
      filtered.sort(function (a, b) {
        var order = String(a.plan_date || "").localeCompare(String(b.plan_date || ""));
        return listState.sort === "oldest" ? order : -order;
      });
      return filtered;
    }

    function render() {
      var root = el("reportList");
      var filtered = applyFilters();
      var shown = filtered.slice(0, visible);
      var html = List.toolbar({
        id: "reports",
        q: listState.q,
        placeholder: "جستجو در تاریخ، یادداشت یا آمار...",
        countText: fa(filtered.length) + " گزارش",
        filters: [{ name: "sort", label: "مرتب‌سازی", value: listState.sort, options: [{ value: "newest", label: "جدیدترین" }, { value: "oldest", label: "قدیمی‌ترین" }] }],
      });
      html += navigator.onLine ? "" : List.offline(state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleTimeString("fa-IR") : "");
      html += '<div class="responsive-list">';
      for (var i = 0; i < shown.length; i++) {
        var report = shown[i];
        html += '<article class="table-row" data-list-row tabindex="0"><div><strong>' + esc(report.plan_date) + "</strong><small>" + esc(report.problem || "بدون یادداشت") + "</small></div><div>تمرکز " + fa(report.focus) + "/۱۰<br><small>خستگی " + fa(report.fatigue) + "/۱۰</small></div><div>" + esc(report.study_hours || "0") + " ساعت<br><small>" + fa(report.tests || 0) + ' تست</small></div><div><span class="tag">انگیزه ' + fa(report.motivation) + "/۱۰</span></div></article>";
      }
      html += "</div>";
      if (!filtered.length) html += List.empty({ filtered: !!listState.q, title: listState.q ? "گزارشی مطابق جستجو پیدا نشد" : "گزارشی ثبت نشده" });
      if (visible < filtered.length) html += '<div class="list-load-more"><button id="reportLoadMore" class="btn soft" type="button">نمایش بیشتر</button></div>';
      root.innerHTML = html;
      List.bind(root, {
        id: "reports",
        onChange: function (name, value) { listState[name] = value; visible = 20; List.write("reports", listState); render(); },
        onReset: function () { listState = { q: "", sort: "newest" }; visible = 20; List.write("reports", listState); render(); },
        onRefresh: load,
      });
      if (el("reportLoadMore")) el("reportLoadMore").onclick = function () { visible += 20; render(); };
    }

    function load() {
      el("reportList").innerHTML = List.skeleton(5);
      api("GET", "/admin/reports?studentId=" + state.studentId, null, function (err, data) {
        if (err) {
          el("reportList").innerHTML = List.error(err.message, "retryReports");
          el("retryReports").onclick = load;
          return;
        }
        reports = data || [];
        visible = 20;
        render();
      });
    }

    return { load: load };
  }

  global.MoshaverAdminReports = { create: create };
})(window);
