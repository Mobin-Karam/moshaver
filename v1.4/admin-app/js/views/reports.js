(function (global) {
  "use strict";

  function create(deps) {
    var state = deps.state;
    var api = deps.api;
    var el = deps.el;
    var esc = deps.esc;
    var fa = deps.fa;
    var toast = deps.toast;

    function load() {
      api("GET", "/admin/reports?studentId=" + state.studentId, null, function (err, data) {
        if (err) return toast(err.message);
        var html = "";
        for (var i = 0; i < data.length; i++) {
          var report = data[i];
          html +=
            '<div class="table-row"><div><strong>' +
            esc(report.plan_date) +
            "</strong><small>" +
            esc(report.problem || "بدون یادداشت") +
            "</small></div><div>تمرکز " +
            fa(report.focus) +
            "/۱۰<br><small>خستگی " +
            fa(report.fatigue) +
            "/۱۰</small></div><div>" +
            esc(report.study_hours || "0") +
            " ساعت<br><small>" +
            fa(report.tests || 0) +
            ' تست</small></div><div><span class="tag">انگیزه ' +
            fa(report.motivation) +
            "/۱۰</span></div></div>";
        }
        el("reportList").innerHTML = html || '<div class="empty-admin">گزارشی ثبت نشده.</div>';
      });
    }

    return { load: load };
  }

  global.MoshaverAdminReports = { create: create };
})(window);
