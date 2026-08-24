(function (global) {
  "use strict";

  function create(deps) {
    var state = deps.state;
    var api = deps.api;
    var el = deps.el;
    var esc = deps.esc;
    var toast = deps.toast;
    var loadStudents = deps.loadStudents;
    var switchView = deps.switchView;
    var selectConversationForStudent = deps.selectConversationForStudent;

    function loadEditor() {
      api("GET", "/admin/students/" + state.studentId + "/overview", null, function (err, overview) {
        if (err) return toast(err.message);
        state.overview = overview;
        var student = overview.student;
        el("studentEditor").innerHTML =
          '<article class="profile-card"><div class="snapshot-head"><div class="avatar">' +
          esc(student.name.charAt(0)) +
          '</div><div><strong>' +
          esc(student.name) +
          "</strong><small>" +
          esc(student.username || "") +
          '</small></div></div><div class="student-form"><label>نام<input id="stName" value="' +
          esc(student.name) +
          '"></label><label>پایه<input id="stGrade" value="' +
          esc(student.grade || "") +
          '"></label><label>رشته<input id="stMajor" value="' +
          esc(student.major || "") +
          '"></label><label>رشته هدف<input id="stTargetMajor" value="' +
          esc(student.target_major || "") +
          '"></label><label>شهر هدف<input id="stTargetCity" value="' +
          esc(student.target_city || "") +
          '"></label><label>رتبه هدف<input id="stRank" value="' +
          esc(student.rank_goal || "") +
          '"></label><label>ظرفیت روزانه<input id="stCapacity" value="' +
          esc(student.daily_capacity || "") +
          '"></label></div><button id="saveStudent" class="btn primary" style="margin-top:12px">ذخیره پروفایل</button></article>';
        el("saveStudent").onclick = function () {
          api(
            "PATCH",
            "/admin/students/" + state.studentId,
            {
              name: el("stName").value,
              grade: el("stGrade").value,
              major: el("stMajor").value,
              targetMajor: el("stTargetMajor").value,
              targetCity: el("stTargetCity").value,
              rankGoal: el("stRank").value,
              dailyCapacity: el("stCapacity").value,
            },
            function (saveErr) {
              if (saveErr) return toast(saveErr.message);
              toast("پروفایل ذخیره شد");
              loadStudents();
            },
          );
        };
      });
    }

    function messageActiveStudent() {
      switchView("chat");
      setTimeout(function () {
        selectConversationForStudent(state.studentId);
      }, 80);
    }

    return {
      loadEditor: loadEditor,
      messageActiveStudent: messageActiveStudent,
    };
  }

  global.MoshaverAdminStudents = { create: create };
})(window);
