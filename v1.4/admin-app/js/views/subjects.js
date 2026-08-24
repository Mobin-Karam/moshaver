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

    function load() {
      api("GET", "/admin/student-subjects/" + state.studentId, null, function (err, data) {
        if (err) return toast(err.message);
        state.subjects = data || [];
        var html = "";
        for (var i = 0; i < state.subjects.length; i++) {
          var subject = state.subjects[i];
          html +=
            '<div class="subject-edit-row"><strong>' +
            esc(subject.name) +
            '</strong><select data-sub-status="' +
            subject.id +
            '"><option value="green"' +
            (subject.status === "green" ? " selected" : "") +
            '>سبز</option><option value="yellow"' +
            (subject.status === "yellow" ? " selected" : "") +
            '>زرد</option><option value="red"' +
            (subject.status === "red" ? " selected" : "") +
            '>قرمز</option></select><input data-sub-progress="' +
            subject.id +
            '" type="number" min="0" max="100" value="' +
            esc(subject.progress || 0) +
            '"><input data-sub-note="' +
            subject.id +
            '" value="' +
            esc(subject.note || "") +
            '" placeholder="یادداشت"><button class="mini-btn" data-save-sub="' +
            subject.id +
            '">ذخیره</button></div>';
        }
        el("subjectAdminList").innerHTML = html;
        var buttons = qa("[data-save-sub]");
        for (i = 0; i < buttons.length; i++) {
          buttons[i].onclick = function () {
            var id = this.getAttribute("data-save-sub");
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
                if (saveErr) return toast(saveErr.message);
                toast("درس ذخیره شد");
              },
            );
          };
        }
      });
    }

    function createSubject() {
      openModal(
        '<h2>درس جدید</h2><div class="form-grid"><label>نام<input id="nsName"></label><label>کلید انگلیسی<input id="nsKey"></label></div><button id="saveNewSubject" class="btn primary full">ساخت</button>',
      );
      el("saveNewSubject").onclick = function () {
        api(
          "POST",
          "/admin/subjects",
          { name: el("nsName").value, subjectKey: el("nsKey").value, displayOrder: 99 },
          function (err) {
            if (err) return toast(err.message);
            closeModal();
            load();
          },
        );
      };
    }

    return { load: load, createSubject: createSubject };
  }

  global.MoshaverAdminSubjects = { create: create };
})(window);
