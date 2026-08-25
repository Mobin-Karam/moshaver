"use strict";

var createExamsService = require("../services/exams.service");

function registerExamsRoutes(router, deps) {
  var str = deps.str;
  var query = deps.query;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var emitAdmin = deps.emitAdmin;
  var emitStudent = deps.emitStudent;
  var exams = createExamsService(deps);

  router.add("GET", /^\/api\/v1\/admin\/exams$/, ["admin"], function (req, res) {
    var q = query(req),
      sid = str(q.studentId, 120);
    ok(res, exams.adminExams(sid));
  });
  router.add(
    "POST",
    /^\/api\/v1\/admin\/exams$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.createAdminExam(body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "create", "exam", result.audit.resourceId, body);
      ok(res, result.data, result.status);
    },
  );
  router.add(
    "PATCH",
    /^\/api\/v1\/admin\/exams\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.updateAdminExam(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "update", "exam", result.audit.resourceId, body);
      ok(res, result.data);
    },
  );
  router.add(
    "DELETE",
    /^\/api\/v1\/admin\/exams\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.deleteAdminExam(match[1]);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "delete", "exam", match[1], {});
      ok(res, result.data);
    },
  );
  router.add(
    "POST",
    /^\/api\/v1\/admin\/exams\/([^/]+)\/syllabus$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.createAdminExamSyllabus(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "create", "exam_syllabus", result.audit.resourceId, body);
      ok(res, result.data, result.status);
    },
  );
  router.add(
    "DELETE",
    /^\/api\/v1\/admin\/syllabus\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.deleteAdminSyllabus(match[1]);
      audit(user, "delete", "exam_syllabus", match[1], {});
      ok(res, result.data);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/exams\/([^/]+)\/questions$/,
    ["admin"],
    function (req, res, match) {
      ok(res, exams.adminExamQuestions(match[1]));
    },
  );
  router.add(
    "POST",
    /^\/api\/v1\/admin\/exams\/([^/]+)\/questions$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.createAdminExamQuestion(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "create", "exam_question", result.audit.resourceId, {
        examId: result.audit.examId,
      });
      ok(res, result.data, result.status);
    },
  );
  router.add(
    "DELETE",
    /^\/api\/v1\/admin\/exams\/([^/]+)\/questions\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.deleteAdminExamQuestion(match[1], match[2]);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "delete", "exam_question", match[2], { examId: match[1] });
      ok(res, result.data);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/exam-attempt-requests$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 120);
      ok(res, exams.adminExamAttemptRequests(sid));
    },
  );
  router.add(
    "PATCH",
    /^\/api\/v1\/admin\/exam-attempt-requests\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.reviewExamAttemptRequest(match[1], body, user.id);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      emitStudent(result.data.studentId, "exam.retry_reviewed", {
        examId: result.data.examId,
        requestId: result.data.id,
        status: result.data.status,
        resolvedAt: result.data.resolvedAt,
      });
      audit(user, "review", "exam_attempt_request", result.data.id, {
        status: result.data.status,
      });
      ok(res, {
        id: result.data.id,
        status: result.data.status,
        resolvedAt: result.data.resolvedAt,
      });
    },
  );

    router.add(
    "GET",
    /^\/api\/v1\/admin\/quizzes$/,
    ["admin"],
    function (req, res) {
      ok(res, exams.adminQuizzes());
    },
  );
    router.add(
    "POST",
    /^\/api\/v1\/admin\/quizzes$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.createAdminQuiz(body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "create", "quiz", result.data.id, body);
      ok(res, result.data, 201);
    },
  );
    router.add(
    "PATCH",
    /^\/api\/v1\/admin\/quizzes\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.updateAdminQuiz(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "update", "quiz", match[1], body);
      ok(res, result.data);
    },
  );
    router.add(
    "GET",
    /^\/api\/v1\/admin\/quizzes\/([^/]+)\/questions$/,
    ["admin"],
    function (req, res, match) {
      ok(res, exams.adminQuizQuestions(match[1]));
    },
  );
    router.add(
    "POST",
    /^\/api\/v1\/admin\/quizzes\/([^/]+)\/questions$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.createAdminQuizQuestion(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "create", "question", result.data.id, {});
      ok(res, result.data, 201);
    },
  );
    router.add(
    "PATCH",
    /^\/api\/v1\/admin\/questions\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = exams.updateAdminQuestion(match[1], body);
      if (result.error) return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "update", "question", match[1], {});
      ok(res, result.data);
    },
  );
  router.add(
    "DELETE",
    /^\/api\/v1\/admin\/questions\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      exams.deleteAdminQuestion(match[1]);
      audit(user, "delete", "question", match[1], {});
      ok(res, { deleted: true });
    },
  );


  router.add(
    "GET",
    /^\/api\/v1\/admin\/students\/([^/]+)\/attempts$/,
    ["admin"],
    function (req, res, match) {
      ok(res, exams.adminStudentQuizHistory(match[1]));
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/students\/([^/]+)\/attempts\/([^/]+)$/,
    ["admin"],
    function (req, res, match) {
      var result = exams.adminAttemptDetail(match[1], match[2]);
      if (result.error) return fail(res, result.error.status, result.error.code, result.error.message);
      ok(res, result.data);
    },
  );
  router.add(
    "GET",
    /^\/api\/v1\/exams$/,
    ["student"],
    function (req, res, match, body, user) {
      var q = query(req);
      ok(res, exams.studentExams(user.student_id, {
        page: q.page,
        limit: q.limit,
        filter: str(q.filter, 30),
        search: str(q.search, 80),
      }));
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/exams\/([^/]+)\/progress$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.studentProgress(user.student_id, match[1]);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      ok(res, result.data);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/exams\/([^/]+)\/start$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.startStudentExam(user.student_id, match[1], body);
      if (result.error)
        return fail(
          res,
          result.error.status,
          result.error.code,
          result.error.message,
          result.error.details,
        );
      ok(res, result.data, result.status);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/exams\/([^/]+)\/retry-request$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.requestStudentRetry(user.student_id, match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      emitAdmin(user.student_id, "exam.retry_requested", {
        studentId: user.student_id,
        examId: result.data.examId,
        requestId: result.data.id,
        title: result.data.title,
        message: result.data.message,
      });
      ok(res, { id: result.data.id, status: result.data.status }, result.status);
    },
  );

  router.add(
    "PUT",
    /^\/api\/v1\/syllabus\/([^/]+)\/progress$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.updateStudentSyllabusProgress(user.student_id, match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      ok(res, result.data);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/mistakes$/,
    ["student"],
    function (req, res, match, body, user) {
      var q = query(req);
      ok(res, exams.studentMistakes(user.student_id, q.limit));
    },
  );
  router.add(
    "PATCH",
    /^\/api\/v1\/mistakes\/([^/]+)$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.updateStudentMistake(user.student_id, match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      ok(res, result.data);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/quizzes\/([^/]+)\/start$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.startStudentQuiz(user.student_id, match[1], body);
      if (result.error)
        return fail(
          res,
          result.error.status,
          result.error.code,
          result.error.message,
          result.error.details,
        );
      ok(res, result.data, result.status);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/quizzes\/(?!history$)([^/]+)$/,
    ["student"],
    function (req, res, match) {
      var result = exams.studentQuiz(match[1]);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      ok(res, result.data);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/quizzes\/([^/]+)\/attempts$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.submitStudentQuizAttempt(user.student_id, match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      ok(res, result.data, result.status);
    },
  );


  router.add(
    "GET",
    /^\/api\/v1\/quizzes\/history\/([^/]+)$/,
    ["student"],
    function (req, res, match, body, user) {
      var result = exams.attemptDetail(user.student_id, match[1]);
      if (result.error) return fail(res, result.error.status, result.error.code, result.error.message);
      ok(res, result.data);
    },
  );
  router.add(
    "GET",
    /^\/api\/v1\/quizzes\/history$/,
    ["student"],
    function (req, res, match, body, user) {
      ok(res, exams.studentQuizHistory(user.student_id));
    },
  );
}

module.exports = registerExamsRoutes;
