(function (global) {
  "use strict";

  function create(deps) {
    var state = deps.state;
    var api = deps.api;
    var el = deps.el;
    var esc = deps.esc;
    var fa = deps.fa || function (v) { return String(v == null ? "" : v); };
    var toast = deps.toast;
    var loadStudents = deps.loadStudents;
    var switchView = deps.switchView;
    var selectConversationForStudent = deps.selectConversationForStudent;
    var openModal = deps.openModal;
    var closeModal = deps.closeModal;

    function currentStudent() {
      for (var i = 0; i < state.students.length; i++) if (state.students[i].id === state.studentId) return state.students[i];
      return null;
    }

    function fmtDate(v) {
      if (!v) return "—";
      try { return new Date(v).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return String(v); }
    }

    function selectStudent(id) {
      state.studentId = id;
      var sel = el("studentSelect");
      if (sel) sel.value = id;
      renderDirectory();
      loadEditor();
    }

    function renderDirectory() {
      var box = el("studentDirectory");
      if (!box) return;
      var search = String((el("studentSearch") && el("studentSearch").value) || "").trim().toLowerCase();
      var filter = (el("studentFilter") && el("studentFilter").value) || "all", sort = (el("studentSort") && el("studentSort").value) || "name", nowMs = Date.now();
      var list = state.students.filter(function (s) {
        var matches = !search || String(s.name || "").toLowerCase().indexOf(search) >= 0 || String(s.username || "").toLowerCase().indexOf(search) >= 0;
        var active = Number(s.active) === 1 && Number(s.account_active == null ? 1 : s.account_active) === 1, last = new Date(s.presence_last_seen_at || s.last_seen_at || 0).getTime(), online = last && nowMs-last<120000, idle = !last || nowMs-last>172800000, weak = s.average_percent != null && Number(s.average_percent)<50, reviews = Number(s.due_learning_count||0)>0;
        return matches && (filter==="all" || filter==="archived"&&s.account_status==="archived" || filter==="active"&&active || filter==="inactive"&&!active || filter==="online"&&online || filter==="reviews"&&reviews || filter==="weak"&&weak || filter==="idle"&&idle || filter==="attention"&&(reviews||weak||idle));
      });
      list.sort(function (a,b) { if(sort==="activity")return new Date(b.presence_last_seen_at||b.last_seen_at||0)-new Date(a.presence_last_seen_at||a.last_seen_at||0);if(sort==="risk")return ((Number(b.due_learning_count||0)*20)+(b.average_percent==null?0:100-Number(b.average_percent)))-((Number(a.due_learning_count||0)*20)+(a.average_percent==null?0:100-Number(a.average_percent)));if(sort==="reviews")return Number(b.due_learning_count||0)-Number(a.due_learning_count||0);if(sort==="created")return new Date(b.created_at||0)-new Date(a.created_at||0);return String(a.name||"").localeCompare(String(b.name||""),"fa"); });
      var h = "";
      for (var i = 0; i < list.length; i++) {
        var s = list[i], active = Number(s.active) === 1 && Number(s.account_active == null ? 1 : s.account_active) === 1;
        h += '<button type="button" class="student-directory-row ' + (s.id === state.studentId ? "active" : "") + '" data-student-row="' + esc(s.id) + '">' +
          '<span class="student-avatar">' + esc(String(s.name || "د").charAt(0)) + '</span><span class="student-directory-copy"><strong>' + esc(s.name) + '</strong><small>@' + esc(s.username || "بدون نام کاربری") + '</small></span>' +
          '<span class="student-directory-meta"><b class="status-chip ' + (active ? "ok" : "muted") + '">' + (active ? "فعال" : "غیرفعال") + '</b><small>' + fa(s.due_learning_count || 0) + ' مرور</small></span></button>';
      }
      if (state.studentDirectoryPage && state.studentDirectoryPage.hasMore) h += '<button id="studentLoadMore" class="btn soft full">نمایش دانش‌آموزان بیشتر</button>';
      box.innerHTML = h || '<div class="empty-admin">دانش‌آموزی پیدا نشد.</div>';
      var rows = box.querySelectorAll("[data-student-row]");
      for (i = 0; i < rows.length; i++) rows[i].onclick = function () { selectStudent(this.getAttribute("data-student-row")); };
      if (el("studentLoadMore")) el("studentLoadMore").onclick = function () { loadStudents(function () { renderDirectory(); }, state.students.length, true); };
      if (el("studentTotalCount")) el("studentTotalCount").textContent = fa(state.studentDirectoryPage && state.studentDirectoryPage.total != null ? state.studentDirectoryPage.total : state.students.length);
    }

    function generatedPassword() {
      var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
      var bytes = new Uint32Array(14);
      if (global.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
      else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 100000);
      var out = "";
      for (i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length];
      return out;
    }

    function showCreatedCredentials(created, password) {
      var username = created && created.username ? created.username : "";
      openModal('<span class="eyebrow">ACCOUNT READY</span><h2>حساب دانش‌آموز آماده است</h2><p class="modal-help">این اطلاعات فقط همین یک‌بار نمایش داده می‌شود.</p><div class="created-credentials"><label>نام کاربری<input id="createdStudentUsername" dir="ltr" readonly value="' + esc(username) + '"></label><label>رمز اولیه<div class="password-inline"><input id="createdStudentPassword" type="password" dir="ltr" readonly value="' + esc(password) + '"><button id="showCreatedPassword" class="mini-btn" type="button">نمایش</button></div></label></div><div class="credential-actions"><button id="copyCreatedUsername" class="btn soft">کپی نام کاربری</button><button id="copyCreatedPassword" class="btn soft">کپی رمز</button></div><button id="copyStudentCredentials" class="btn primary full">کپی هر دو</button><button id="closeCreatedCredentials" class="btn soft full">باز کردن پرونده دانش‌آموز</button>');
      function copyText(text, message) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(message); }); }
      el("showCreatedPassword").onclick = function () { var input = el("createdStudentPassword"); input.type = input.type === "password" ? "text" : "password"; this.textContent = input.type === "password" ? "نمایش" : "پنهان"; };
      el("copyCreatedUsername").onclick = function () { copyText(username, "نام کاربری کپی شد"); };
      el("copyCreatedPassword").onclick = function () { copyText(password, "رمز کپی شد"); };
      el("copyStudentCredentials").onclick = function () {
        var text = "نام کاربری: " + username + "\nرمز اولیه: " + password;
        function copied() { toast("اطلاعات ورود کپی شد"); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(copied).catch(function () {
          var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); copied(); } catch (e) { toast("کپی خودکار ممکن نبود؛ اطلاعات را دستی کپی کن.", "error"); } document.body.removeChild(ta);
        });
        else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); copied(); } catch (e) { toast("کپی خودکار ممکن نبود؛ اطلاعات را دستی کپی کن.", "error"); } document.body.removeChild(ta); }
      };
      el("closeCreatedCredentials").onclick = closeModal;
    }

    function openCreateStudent() {
      var password = generatedPassword();
      openModal('<span class="eyebrow">NEW STUDENT</span><h2>ساخت سریع حساب دانش‌آموز</h2><p class="modal-help">فقط نام و نام کاربری را وارد کن؛ رمز امن آماده است و بعداً هم می‌توانی آن را عوض کنی.</p>' +
        '<div class="form-grid"><label>نام و نام خانوادگی<input id="newStudentName" autocomplete="off"></label><label>نام کاربری<input id="newStudentUsername" dir="ltr" autocomplete="off"></label><label>پایه<input id="newStudentGrade" value="دوازدهم انسانی"></label><label>رشته<input id="newStudentMajor" value="انسانی"></label><label class="span-2">رمز اولیه<div class="password-inline"><input id="newStudentPassword" dir="ltr" value="' + esc(password) + '"><button id="regenStudentPassword" type="button" class="mini-btn">رمز تازه</button></div></label></div>' +
        '<div class="credential-note">بعد از ساخت، رمز اولیه را امن به دانش‌آموز بده. رمز در دیتابیس به‌صورت هش ذخیره می‌شود.</div><button id="createStudentSubmit" class="btn primary full">ساخت حساب و باز کردن پروفایل</button>');
      el("regenStudentPassword").onclick = function () { el("newStudentPassword").value = generatedPassword(); };
      el("createStudentSubmit").onclick = function () {
        var btn = this;
        var body = { name: el("newStudentName").value, username: el("newStudentUsername").value, password: el("newStudentPassword").value, grade: el("newStudentGrade").value, major: el("newStudentMajor").value };
        if (!String(body.name).trim() || !String(body.username).trim() || String(body.password).length < 8) return toast("نام، نام کاربری و رمز حداقل ۸ نویسه‌ای لازم است.", "error");
        btn.disabled = true;
        api("POST", "/admin/students", body, function (err, created) {
          btn.disabled = false;
          if (err) return toast(err.message, "error");
          closeModal();
          state.studentId = created.id;
          toast("حساب دانش‌آموز ساخته شد");
          loadStudents(function () { var sel = el("studentSelect"); if (sel) sel.value = state.studentId; renderDirectory(); loadEditor(); });
          showCreatedCredentials({ id: created.id, username: created.username || body.username }, body.password);
        });
      };
    }

    function loadEditor() {
      renderDirectory();
      if (!state.studentId) {
        el("studentEditor").innerHTML = '<div class="empty-admin">ابتدا یک دانش‌آموز بساز.</div>';
        return;
      }
      el("studentEditor").innerHTML = '<div class="panel student-editor-loading">در حال بارگذاری پرونده دانش‌آموز…</div>';
      var remaining = 5, result = { overview: null, learning: null, attempts: null, weekly: null, topics: null }, failed = false;
      function done() { if (--remaining === 0 && !failed) renderEditor(result); }
      api("GET", "/admin/students/" + state.studentId + "/overview", null, function (err, data) { if (err) { failed = true; return toast(err.message); } result.overview = data; done(); });
      api("GET", "/admin/students/" + state.studentId + "/learning", null, function (err, data) { if (err) { failed = true; return toast(err.message); } result.learning = data; done(); });
      api("GET", "/admin/students/" + state.studentId + "/attempts", null, function (err, data) { if (err) { failed = true; return toast(err.message); } result.attempts = data || []; done(); });
      api("GET", "/admin/students/" + state.studentId + "/progress/weekly", null, function (err, data) { if (err) { failed = true; return toast(err.message); } result.weekly = data || {}; done(); });
      api("GET", "/admin/students/" + state.studentId + "/performance/topics?limit=8", null, function (err, data) { if (err) { failed = true; return toast(err.message); } result.topics = data || []; done(); });
    }

    function renderEditor(data) {
      var overview = data.overview || {}, student = overview.student || {}, learning = data.learning || { summary: {}, items: [] }, summary = learning.summary || {}, attempts = data.attempts || [], weekly = data.weekly || {}, topics = data.topics || [];
      state.overview = overview;
      var active = Number(student.active) === 1 && Number(student.account_active == null ? 1 : student.account_active) === 1;
      var archived=student.account_status==="archived";
      var h = '<div class="student-workspace-head"><div class="snapshot-head"><div class="avatar">' + esc(String(student.name || "د").charAt(0)) + '</div><div><strong>' + esc(student.name || "") + '</strong><small>@' + esc(student.username || "") + ' • ' + (archived?"بایگانی‌شده":active ? "حساب فعال" : "حساب غیرفعال") + '</small></div></div><div class="head-actions">'+(archived?'<button id="studentRestore" class="btn primary">بازیابی حساب</button>':'<button id="studentMessageInline" class="btn soft">پیام</button><button id="studentResetPassword" class="btn soft">رمز جدید</button><button id="studentToggleActive" class="btn ' + (active ? "danger-outline" : "primary") + '">' + (active ? "غیرفعال‌سازی" : "فعال‌سازی") + '</button><button id="studentArchive" class="btn danger-outline">بایگانی</button>')+'</div></div>';
      h += '<div class="student-kpi-grid"><div><small>میانگین آزمون</small><strong>' + fa(summary.averageExamPercent || 0) + '%</strong></div><div><small>اجرای برنامه هفته</small><strong>' + fa(weekly.planCompletion || 0) + '%</strong></div><div><small>مرور سررسید</small><strong>' + fa(summary.dueItems || 0) + '</strong></div><div><small>مطالعه هفته</small><strong>' + fa(Math.round((weekly.studyMinutes || 0) / 60)) + ' ساعت</strong></div></div>';
      if (topics.length) { var weak = topics[0]; h += '<article class="panel attention-inline"><div><span class="eyebrow">نیاز به توجه</span><h3>' + esc(weak.subject + ' — ' + weak.topic) + '</h3><p>دقت ' + fa(weak.accuracy) + '% در ' + fa(weak.answered) + ' پاسخ • ' + esc(weak.status) + '</p></div><div class="head-actions"><button id="attentionReview" class="btn soft">ایجاد مرور</button><button id="attentionMessage" class="btn primary">پیام به دانش‌آموز</button></div></article>'; }
      h += '<div class="two-col student-admin-cols"><article class="profile-card"><div class="panel-head"><div><h3>پروفایل و حساب</h3><p>ویرایش سریع اطلاعات و نام کاربری</p></div></div><div class="student-form"><label>نام<input id="stName" value="' + esc(student.name || "") + '"></label><label>نام کاربری<input id="stUsername" dir="ltr" value="' + esc(student.username || "") + '"></label><label>پایه<input id="stGrade" value="' + esc(student.grade || "") + '"></label><label>رشته<input id="stMajor" value="' + esc(student.major || "") + '"></label><label>رشته هدف<input id="stTargetMajor" value="' + esc(student.target_major || "") + '"></label><label>شهر هدف<input id="stTargetCity" value="' + esc(student.target_city || "") + '"></label><label>رتبه هدف<input id="stRank" value="' + esc(student.rank_goal || "") + '"></label><label>ظرفیت روزانه<input id="stCapacity" value="' + esc(student.daily_capacity || "") + '"></label></div><button id="saveStudent" class="btn primary full">ذخیره تغییرات</button></article>';
      h += '<article class="panel"><div class="panel-head"><div><h3>سیستم یادگیری</h3><p>مواردی که باید دوباره یاد گرفته شوند</p></div><button id="addLearningItem" class="mini-btn">+ مورد جدید</button></div><div id="adminLearningItems">';
      var items = (learning.items || []).slice(0, 10);
      for (var i = 0; i < items.length; i++) h += learningRow(items[i]);
      h += items.length ? "" : '<div class="empty-admin">مورد یادگیری فعالی نیست.</div>';
      h += '</div></article></div>';
      h += '<article class="panel attempt-history-panel"><div class="panel-head"><div><h3>تاریخچه آزمون و تمرین</h3><p>نتیجه، زمان، پاسخ‌ها و دفتر یادگیری هر تلاش</p></div><span class="count">' + fa(attempts.length) + '</span></div><div class="attempt-admin-list">';
      for (i = 0; i < attempts.slice(0, 20).length; i++) {
        var a = attempts[i];
        h += '<button class="attempt-admin-row" data-attempt="' + esc(a.id) + '"><span><strong>' + esc(a.title || "آزمون") + '</strong><small>' + esc(a.subject || "") + ' • ' + esc(fmtDate(a.submittedAt)) + '</small></span><span class="attempt-score ' + (Number(a.percent) >= 70 ? "good" : Number(a.percent) < 50 ? "bad" : "") + '">' + fa(a.percent || 0) + '%</span><span>' + fa(a.correct || 0) + ' درست / ' + fa(a.wrong || 0) + ' غلط</span></button>';
      }
      h += attempts.length ? "" : '<div class="empty-admin">هنوز آزمونی ثبت نشده.</div>';
      h += '</div></article>';
      el("studentEditor").innerHTML = h;
      bindEditorActions(student, active);
      if (el("attentionReview")) el("attentionReview").onclick = function () { openLearningForm(null, { subject: topics[0].subject, title: topics[0].topic, topic: topics[0].topic }); };
      if (el("attentionMessage")) el("attentionMessage").onclick = messageActiveStudent;
    }

    function learningRow(item) {
      var loc = [item.book, item.chapter, item.lesson].filter(Boolean).join(" • ");
      return '<div class="learning-admin-row"><div><strong>' + esc(item.subject ? item.subject + " — " + item.title : item.title) + '</strong><p>' + esc(loc || item.topic || item.note || "") + '</p><small>مرور بعدی: ' + esc(item.dueDate || "—") + ' • تسلط ' + fa(item.mastery || 0) + '/۵</small></div><div><button class="mini-btn" data-edit-learning="' + esc(item.id) + '">ویرایش</button><button class="mini-btn danger-text" data-delete-learning="' + esc(item.id) + '">حذف</button></div></div>';
    }

    function bindEditorActions(student, active) {
      if (student.account_status==="archived") { el("studentRestore").onclick=function(){api("POST","/admin/students/"+state.studentId+"/restore",{},function(err){if(err)return toast(err.message,"error");toast("حساب با تاریخچه کامل بازیابی شد");el("studentFilter").value="all";loadStudents(function(){renderDirectory();loadEditor();});});}; return; }
      el("saveStudent").onclick = function () {
        var btn = this; btn.disabled = true;
        api("PATCH", "/admin/students/" + state.studentId, { name: el("stName").value, username: el("stUsername").value, grade: el("stGrade").value, major: el("stMajor").value, targetMajor: el("stTargetMajor").value, targetCity: el("stTargetCity").value, rankGoal: el("stRank").value, dailyCapacity: el("stCapacity").value }, function (err) {
          btn.disabled = false; if (err) return toast(err.message, "error"); toast("پروفایل و حساب ذخیره شد"); loadStudents(function () { renderDirectory(); loadEditor(); });
        });
      };
      el("studentMessageInline").onclick = messageActiveStudent;
      el("studentResetPassword").onclick = openResetPassword;
      el("studentToggleActive").onclick = function () {
        var action = active ? "غیرفعال" : "فعال";
        if (!confirm("حساب دانش‌آموز " + action + " شود؟" + (active ? " نشست‌های فعال او هم بسته می‌شوند." : ""))) return;
        api("POST", "/admin/students/" + state.studentId + (active ? "/deactivate" : "/activate"), {}, function (err) { if (err) return toast(err.message, "error"); toast("وضعیت حساب تغییر کرد"); loadStudents(function () { renderDirectory(); loadEditor(); }); });
      };
      el("studentArchive").onclick = function () {
        if (!confirm("این حساب بایگانی شود؟ تاریخچه آموزشی حفظ می‌شود و ورود دانش‌آموز متوقف خواهد شد.")) return;
        api("DELETE", "/admin/students/" + state.studentId, null, function (err) { if (err) return toast(err.message, "error"); toast("حساب با حفظ تاریخچه بایگانی شد"); state.studentId = null; loadStudents(function () { if (state.students.length) state.studentId = state.students[0].id; renderDirectory(); loadEditor(); }); });
      };
      el("addLearningItem").onclick = function () { openLearningForm(null); };
      var bs = document.querySelectorAll("[data-edit-learning]");
      for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { openLearningById(this.getAttribute("data-edit-learning")); };
      bs = document.querySelectorAll("[data-delete-learning]");
      for (i = 0; i < bs.length; i++) bs[i].onclick = function () { var id = this.getAttribute("data-delete-learning"); if (confirm("این مورد از سیستم یادگیری حذف شود؟")) api("DELETE", "/admin/students/" + state.studentId + "/learning/" + id, null, function (err) { if (err) return toast(err.message, "error"); toast("حذف شد"); loadEditor(); }); };
      bs = document.querySelectorAll("[data-attempt]");
      for (i = 0; i < bs.length; i++) bs[i].onclick = function () { openAttempt(this.getAttribute("data-attempt")); };
    }

    function openResetPassword() {
      var pass = generatedPassword();
      openModal('<span class="eyebrow">ACCOUNT</span><h2>رمز جدید دانش‌آموز</h2><label>رمز جدید<div class="password-inline"><input id="resetStudentPasswordValue" dir="ltr" value="' + esc(pass) + '"><button id="regenResetPassword" class="mini-btn" type="button">رمز تازه</button></div></label><p class="modal-help">با ثبت رمز، همه نشست‌های فعلی دانش‌آموز بسته می‌شوند.</p><button id="resetStudentPasswordSubmit" class="btn primary full">ثبت رمز جدید</button>');
      el("regenResetPassword").onclick = function () { el("resetStudentPasswordValue").value = generatedPassword(); };
      el("resetStudentPasswordSubmit").onclick = function () { var p = el("resetStudentPasswordValue").value; if (p.length < 8) return toast("رمز حداقل ۸ نویسه باشد.", "error"); api("POST", "/admin/students/" + state.studentId + "/reset-password", { password: p }, function (err) { if (err) return toast(err.message, "error"); closeModal(); toast("رمز تغییر کرد و نشست‌های قبلی بسته شدند"); }); };
    }

    function openLearningById(id) {
      api("GET", "/admin/students/" + state.studentId + "/learning", null, function (err, data) {
        if (err) return toast(err.message, "error");
        var items = data.items || [], item = null;
        for (var i = 0; i < items.length; i++) if (items[i].id === id) item = items[i];
        if (item) openLearningForm(item);
      });
    }

    function openLearningForm(item, source) {
      item = item || {}; source = source || {};
      openModal('<span class="eyebrow">LEARNING LOOP</span><h2>' + (item.id ? "ویرایش مورد یادگیری" : "افزودن به برنامه مرور") + '</h2><div class="form-grid"><label>درس<input id="learnSubject" value="' + esc(item.subject || source.subject || "") + '"></label><label>کتاب<input id="learnBook" value="' + esc(item.book || source.book || "") + '"></label><label>فصل<input id="learnChapter" value="' + esc(item.chapter || source.chapter || "") + '"></label><label>درس / مبحث<input id="learnLesson" value="' + esc(item.lesson || source.lesson || "") + '"></label><label class="span-2">عنوان<input id="learnTitle" value="' + esc(item.title || source.title || "") + '"></label><label>تاریخ مرور<input id="learnDue" type="date" value="' + esc(item.dueDate || source.dueDate || new Date().toISOString().slice(0, 10)) + '"></label><label>تسلط ۰ تا ۵<input id="learnMastery" type="number" min="0" max="5" value="' + esc(item.mastery || 0) + '"></label><label class="span-2">یادداشت دانش‌آموز / مشاور<textarea id="learnNote" rows="3">' + esc(item.note || source.note || "") + '</textarea></label><label class="span-2">هینت برای مرور بعدی<textarea id="learnHint" rows="3">' + esc(item.hint || source.hint || "") + '</textarea></label></div><button id="saveLearningItem" class="btn primary full">ذخیره در سیستم یادگیری</button>');
      el("saveLearningItem").onclick = function () {
        var body = { subject: el("learnSubject").value, book: el("learnBook").value, chapter: el("learnChapter").value, lesson: el("learnLesson").value, title: el("learnTitle").value, dueDate: el("learnDue").value, mastery: Number(el("learnMastery").value || 0), note: el("learnNote").value, hint: el("learnHint").value };
        if (source.sourceAnswerId) body.sourceAnswerId = source.sourceAnswerId;
        api(item.id ? "PATCH" : "POST", "/admin/students/" + state.studentId + "/learning" + (item.id ? "/" + item.id : ""), body, function (err) { if (err) return toast(err.message, "error"); closeModal(); toast("سیستم یادگیری به‌روز شد"); loadEditor(); });
      };
    }

    function optionText(a, key) { return a["option" + key.toUpperCase()] || ""; }

    function openAttempt(id) {
      api("GET", "/admin/students/" + state.studentId + "/attempts/" + id, null, function (err, attempt) {
        if (err) return toast(err.message, "error");
        var h = '<span class="eyebrow">ATTEMPT REVIEW</span><h2>' + esc(attempt.title || "آزمون") + '</h2><div class="attempt-detail-summary"><strong>' + fa(attempt.percent || 0) + '%</strong><span>' + fa(attempt.correct || 0) + ' درست</span><span>' + fa(attempt.wrong || 0) + ' غلط</span><span>' + fa(attempt.blank || 0) + ' نزده</span><span>' + fa(Math.round((attempt.durationSeconds || 0) / 60)) + ' دقیقه</span></div><div class="attempt-question-list">';
        var answers = attempt.answers || [];
        for (var i = 0; i < answers.length; i++) {
          var a = answers[i], correct = Number(a.isCorrect) === 1;
          h += '<article class="attempt-question ' + (correct ? "correct" : "wrong") + '"><div class="attempt-question-head"><strong>' + fa(i + 1) + '. ' + esc(a.question) + '</strong><b>' + (correct ? "درست" : "نیاز به مرور") + '</b></div><div class="attempt-options">';
          ["A", "B", "C", "D"].forEach(function (k) { var low = k.toLowerCase(), cls = low === a.correctOption ? "correct-option" : low === a.selectedOption ? "selected-wrong" : ""; h += '<span class="' + cls + '">' + k + ') ' + esc(optionText(a, k)) + '</span>'; });
          h += '</div>' + (a.explanation ? '<p class="answer-explanation"><strong>توضیح:</strong> ' + esc(a.explanation) + '</p>' : '') + '<div class="question-learning-meta">' + esc([a.book, a.chapter, a.lesson, a.topic].filter(Boolean).join(" • ")) + '</div><button class="mini-btn" data-answer-learning="' + esc(a.answerId) + '" data-answer-index="' + i + '">' + (a.learningItemId ? "ویرایش یادداشت/مرور" : "افزودن یادداشت و مرور") + '</button></article>';
        }
        h += '</div>';
        openModal(h);
        var bs = document.querySelectorAll("[data-answer-learning]");
        for (i = 0; i < bs.length; i++) bs[i].onclick = function () {
          var a = answers[Number(this.getAttribute("data-answer-index"))];
          if (a.learningItemId) { closeModal(); openLearningById(a.learningItemId); }
          else { closeModal(); openLearningForm(null, { sourceAnswerId: a.answerId, subject: attempt.subject, book: a.book, chapter: a.chapter, lesson: a.lesson, title: a.question, hint: a.hint || "" }); }
        };
      });
    }

    function messageActiveStudent() {
      switchView("chat");
      setTimeout(function () { selectConversationForStudent(state.studentId); }, 80);
    }

    function bindPage() {
      if (el("studentSearch")) { var searchTimer = null; el("studentSearch").oninput = function () { clearTimeout(searchTimer); searchTimer = setTimeout(function () { loadStudents(function () { renderDirectory(); }); }, 220); }; }
      if (el("studentFilter")) el("studentFilter").onchange = function () { loadStudents(function () { renderDirectory(); if(state.students.length){state.studentId=state.students[0].id;loadEditor();} }); };
      if (el("studentSort")) el("studentSort").onchange = renderDirectory;
      if (el("newStudentBtn")) el("newStudentBtn").onclick = openCreateStudent;
    }

    return { loadEditor: loadEditor, renderDirectory: renderDirectory, bindPage: bindPage, openCreateStudent: openCreateStudent, messageActiveStudent: messageActiveStudent };
  }

  global.MoshaverAdminStudents = { create: create };
})(window);
