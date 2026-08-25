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

    function loadHealth() {
      api("GET", "/admin/system/database", null, function (err, data) {
        if (err || !el("systemHealthGrid")) return;
        function size(n) { n=Number(n||0); return n<1048576?Math.round(n/1024)+" KB":(n/1048576).toFixed(1)+" MB"; }
        el("systemHealthGrid").innerHTML =
          '<article class="live-context-card"><small>پایگاه داده</small><strong>'+esc(data.status==="healthy"?"سالم":"نیازمند بررسی")+'</strong><span>'+esc(data.engine||"sqlite")+' • '+size(data.sizeBytes)+'</span></article>'+
          '<article class="live-context-card"><small>نسخه سرویس</small><strong>'+esc(data.version||"—")+'</strong><span>'+esc(data.environment||"—")+'</span></article>'+
          '<article class="live-context-card"><small>نشست‌های فعال</small><strong>'+fa(data.activeSessions||0)+'</strong><span>'+fa(data.realtimeConnections||0)+' اتصال زنده</span></article>'+
          '<article class="live-context-card"><small>آخرین پشتیبان</small><strong>'+esc(data.lastBackupAt?new Date(data.lastBackupAt).toLocaleString("fa-IR"):"هنوز ساخته نشده")+'</strong><span>زمان کارکرد '+fa(Math.round(Number(data.uptimeSeconds||0)/60))+' دقیقه</span></article>';
      });
    }

    function downloadBackup() {
      var button=el("downloadBackupBtn"), status=el("backupStatus"), xhr=new XMLHttpRequest();
      button.disabled=true; status.textContent="در حال ساخت snapshot امن…";
      xhr.open("POST", global.API.base()+"/admin/system/database-backup", true); xhr.responseType="blob"; xhr.withCredentials=true;
      xhr.setRequestHeader("Content-Type","application/json"); xhr.setRequestHeader("X-CSRF-Token",global.API.csrf());
      xhr.onload=function(){ button.disabled=false; if(xhr.status!==200){status.textContent="ساخت پشتیبان ناموفق بود.";return toast("دانلود پشتیبان ناموفق بود","error");}
        var disposition=xhr.getResponseHeader("Content-Disposition")||"",match=/filename="([^"]+)"/.exec(disposition),name=match?match[1]:"moshaver-backup.sqlite",url=URL.createObjectURL(xhr.response),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);status.textContent="پشتیبان سالم دانلود شد: "+name;toast("پشتیبان پایگاه داده دانلود شد");loadHealth(); };
      xhr.onerror=function(){button.disabled=false;status.textContent="ارتباط با سرور قطع شد.";toast("دانلود پشتیبان ناموفق بود","error");}; xhr.send("{}");
    }

    function loadSessions() {
      api("GET", "/auth/sessions", null, function (err, data) {
        if (err) return;
        var html = "";
        for (var i = 0; i < data.length; i++) {
          var session = data[i];
          var userAgent = String(session.userAgent || "").slice(0, 75);
          html +=
            '<div class="session-row"><div><strong>' +
            (session.current ? "نشست فعلی" : "نشست فعال") +
            "</strong><small>" +
            esc(session.ipAddress || "IP نامشخص") +
            " • " +
            esc(userAgent || "مرورگر نامشخص") +
            "</small><small>آخرین فعالیت: " +
            esc(session.lastSeenAt || "—") +
            "</small></div>" +
            (session.current
              ? '<span class="tag">فعلی</span>'
              : '<button class="mini-btn danger-text" data-revoke-session="' +
                esc(session.id) +
                '">خروج این نشست</button>') +
            "</div>";
        }
        el("sessionList").innerHTML = html || '<div class="empty-admin">نشستی پیدا نشد.</div>';
        var buttons = qa("[data-revoke-session]");
        for (i = 0; i < buttons.length; i++) {
          buttons[i].onclick = function () {
            var id = this.getAttribute("data-revoke-session");
            api("DELETE", "/auth/sessions/" + encodeURIComponent(id), null, function (revokeErr) {
              if (revokeErr) return toast(revokeErr.message);
              toast("نشست بسته شد");
              loadSessions();
            });
          };
        }
      });
    }

    function load() {
      api("GET", "/admin/import/history", null, function (err, data) {
        if (!err) {
          var html = "";
          for (var i = 0; i < data.length; i++) {
            var item = data[i];
            html +=
              '<div class="inbox-item"><div><strong>' +
              esc(item.source_name || "JSON import") +
              "</strong><p>" +
              fa(item.plan_count) +
              " برنامه • " +
              fa(item.task_count) +
              " فعالیت • " +
              fa(item.exam_count) +
              " آزمون</p><small>" +
              esc(item.created_at) +
              '</small></div><span class="tag ' +
              (item.published ? "" : "warn") +
              '">' +
              (item.published ? "منتشر" : "پیش‌نویس") +
              "</span></div>";
          }
          el("importHistory").innerHTML = html || '<div class="empty-admin">هنوز ورودی JSON ثبت نشده.</div>';
        }
      });
      api("GET", "/admin/app-releases", null, function (err, data) {
        if (!err) {
          var html = "";
          for (var i = 0; i < data.length; i++) {
            var release = data[i];
            html +=
              '<div class="inbox-item"><div><strong>' +
              esc(release.app_name) +
              " " +
              esc(release.version) +
              "</strong><p>" +
              esc(release.notes || "") +
              "</p></div></div>";
          }
          el("releaseList").innerHTML = html || '<div class="empty-admin">—</div>';
        }
      });
      loadSessions();
      loadHealth();
    }

    function openChangePassword() {
      openModal(
        '<span class="eyebrow">SECURITY</span><h2>تغییر رمز عبور</h2><label>رمز فعلی<input id="currentPassword" type="password" autocomplete="current-password"></label><label>رمز جدید<input id="newPassword" type="password" minlength="12" autocomplete="new-password"></label><label>تکرار رمز جدید<input id="newPassword2" type="password" minlength="12" autocomplete="new-password"></label><p>حداقل ۱۲ نویسه؛ بعد از تغییر، سایر نشست‌های حساب بسته می‌شوند.</p><button id="savePassword" class="btn primary full">تغییر رمز</button>',
      );
      el("savePassword").onclick = function () {
        var password = el("newPassword").value;
        var repeated = el("newPassword2").value;
        if (password !== repeated) return toast("تکرار رمز با رمز جدید یکسان نیست.");
        api(
          "POST",
          "/auth/change-password",
          { currentPassword: el("currentPassword").value, newPassword: password },
          function (err) {
            if (err) return toast(err.message);
            closeModal();
            toast("رمز تغییر کرد و نشست‌های دیگر بسته شدند.");
            loadSessions();
          },
        );
      };
    }

    return {
      load: load,
      loadSessions: loadSessions,
      openChangePassword: openChangePassword,
      downloadBackup: downloadBackup,
    };
  }

  global.MoshaverAdminSystem = { create: create };
})(window);
