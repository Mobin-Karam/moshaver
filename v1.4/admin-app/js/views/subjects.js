(function (global) {
  "use strict";

  function create(deps) {
    var state = deps.state;
    var api = deps.api;
    var el = deps.el;
    var q = deps.q;
    var qa = deps.qa;
    var esc = deps.esc;
    var toast = deps.toast;
    var openModal = deps.openModal;
    var closeModal = deps.closeModal;
    var List = global.MoshaverAdminList;
    var fa = global.MoshaverAdminDates.faNum;
    var listState = List.read("subjects", { q: "", status: "all", sort: "name" });

    function filteredSubjects() {
      var query = String(listState.q || "").trim().toLowerCase();
      var items = (state.subjects || []).filter(function (subject) {
        var matchesQuery = !query || [subject.name, subject.subject_key, subject.note].join(" ").toLowerCase().indexOf(query) >= 0;
        var matchesStatus = listState.status === "all" || subject.status === listState.status;
        return matchesQuery && matchesStatus;
      });
      items.sort(function (a, b) {
        if (listState.sort === "progress") return Number(b.progress || 0) - Number(a.progress || 0);
        if (listState.sort === "risk") return ({ red: 0, yellow: 1, green: 2 }[a.status] || 3) - ({ red: 0, yellow: 1, green: 2 }[b.status] || 3);
        return String(a.name || "").localeCompare(String(b.name || ""), "fa");
      });
      return items;
    }

    function bindSaveButtons() {
      var buttons = qa("[data-save-sub]");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].onclick = function () {
          var id = this.getAttribute("data-save-sub");
          this.disabled = true;
          api(
            "PATCH",
            "/admin/student-subjects/" + state.studentId + "/" + id,
            {
              status: q('[data-sub-status="' + id + '"]').value,
              progress: Number(q('[data-sub-progress="' + id + '"]').value || 0),
              note: q('[data-sub-note="' + id + '"]').value,
              mastery: "",
            },
            function (saveErr) {
              var button = q('[data-save-sub="' + id + '"]');
              if (button) button.disabled = false;
              if (saveErr) return toast(saveErr.message);
              toast("درس ذخیره شد");
            },
          );
        };
      }
    }

    function render() {
      var root = el("subjectAdminList");
      var items = filteredSubjects();
      var html = List.toolbar({
        id: "subjects",
        q: listState.q,
        placeholder: "جستجو درس یا یادداشت...",
        countText: fa(items.length) + " درس",
        filters: [
          { name: "status", label: "وضعیت", value: listState.status, options: [{ value: "all", label: "همه وضعیت‌ها" }, { value: "green", label: "سبز" }, { value: "yellow", label: "زرد" }, { value: "red", label: "قرمز" }] },
          { name: "sort", label: "مرتب‌سازی", value: listState.sort, options: [{ value: "name", label: "نام" }, { value: "risk", label: "پرریسک اول" }, { value: "progress", label: "پیشرفت" }] },
        ],
      });
      html += navigator.onLine ? "" : List.offline(state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleTimeString("fa-IR") : "");
      html += '<div class="responsive-list">';
      for (var i = 0; i < items.length; i++) {
        var subject = items[i];
        html += '<div class="subject-edit-row table-row" data-list-row><strong>' + esc(subject.name) + '</strong><select data-sub-status="' + subject.id + '"><option value="green"' + (subject.status === "green" ? " selected" : "") + '>سبز</option><option value="yellow"' + (subject.status === "yellow" ? " selected" : "") + '>زرد</option><option value="red"' + (subject.status === "red" ? " selected" : "") + '>قرمز</option></select><input data-sub-progress="' + subject.id + '" type="number" min="0" max="100" value="' + esc(subject.progress || 0) + '"><input data-sub-note="' + subject.id + '" value="' + esc(subject.note || "") + '" placeholder="یادداشت"><button class="mini-btn" data-save-sub="' + subject.id + '">ذخیره</button></div>';
      }
      html += "</div>";
      if (!items.length) html += List.empty({ filtered: !!listState.q || listState.status !== "all", title: "درسی مطابق فیلترها پیدا نشد", actionId: "subjectEmptyCreate", actionLabel: "درس جدید" });
      root.innerHTML = html;
      List.bind(root, {
        id: "subjects",
        onChange: function (name, value) { listState[name] = value; List.write("subjects", listState); render(); },
        onReset: function () { listState = { q: "", status: "all", sort: "name" }; List.write("subjects", listState); render(); },
        onRefresh: load,
      });
      if (el("subjectEmptyCreate")) el("subjectEmptyCreate").onclick = createSubject;
      bindSaveButtons();
    }

    function load() {
      el("subjectAdminList").innerHTML = List.skeleton(5);
      api("GET", "/admin/student-subjects/" + state.studentId, null, function (err, data) {
        if (err) {
          el("subjectAdminList").innerHTML = List.error(err.message, "retrySubjects");
          el("retrySubjects").onclick = load;
          return;
        }
        state.subjects = data || [];
        render();
      });
    }

    function createSubject() {
      openModal('<h2>درس جدید</h2><div class="form-grid"><label>نام<input id="nsName"></label><label>کلید انگلیسی<input id="nsKey"></label></div><button id="saveNewSubject" class="btn primary full">ساخت</button>');
      el("saveNewSubject").onclick = function () {
        api("POST", "/admin/subjects", { name: el("nsName").value, subjectKey: el("nsKey").value, displayOrder: 99 }, function (err) {
          if (err) return toast(err.message);
          closeModal();
          load();
        });
      };
    }

    return { load: load, createSubject: createSubject };
  }

  global.MoshaverAdminSubjects = { create: create };
})(window);
