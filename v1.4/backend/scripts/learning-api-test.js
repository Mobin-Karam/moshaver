"use strict";
var http = require("http");
var cp = require("child_process");
var path = require("path");
var fs = require("fs");
var root = path.resolve(__dirname, "..");
var tmp = path.join(root, "data", "learning-api-" + process.pid + ".sqlite");
var port = 4201;
try { fs.unlinkSync(tmp); } catch (e) {}
var env = Object.assign({}, process.env, {
  NODE_ENV: "test",
  PORT: String(port),
  DATABASE_PATH: tmp,
  CORS_ORIGINS: "http://localhost:8080,http://localhost:8081",
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "LearningAdmin123!",
  STUDENT_USERNAME: "student",
  STUDENT_PASSWORD: "LearningStudent123!",
  ALLOW_BEARER_AUTH: "false",
});
var child = cp.spawn(process.execPath, ["--experimental-sqlite", path.join(root, "src/server.js")], {
  cwd: root,
  env: env,
  stdio: ["ignore", "pipe", "pipe"],
});
var done = false, started = false;
function cleanup(code) {
  if (done) return;
  done = true;
  try { child.kill("SIGTERM"); } catch (e) {}
  setTimeout(function () {
    ["", "-wal", "-shm"].forEach(function (x) { try { fs.unlinkSync(tmp + x); } catch (e) {} });
    process.exit(code);
  }, 250);
}
function assert(ok, msg) { if (!ok) throw new Error(msg); }
function cookieFrom(res) {
  var h = res.headers["set-cookie"];
  return h && h.length ? String(h[0]).split(";")[0] : "";
}
function request(method, pathname, body, auth, origin) {
  return new Promise(function (resolve, reject) {
    var payload = body == null ? null : JSON.stringify(body);
    var headers = { Accept: "application/json" };
    if (payload) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(payload); }
    if (auth && auth.cookie) headers.Cookie = auth.cookie;
    if (auth && auth.csrf) headers["X-CSRF-Token"] = auth.csrf;
    if (origin) headers.Origin = origin;
    var req = http.request({ host: "127.0.0.1", port: port, path: pathname, method: method, headers: headers }, function (res) {
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        var text = Buffer.concat(chunks).toString("utf8"), json = null;
        try { json = JSON.parse(text); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, json: json, text: text });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
async function login(username, password, origin) {
  var r = await request("POST", "/api/v1/auth/login", { username: username, password: password }, null, origin);
  assert(r.status === 200, "login failed: " + r.text);
  return { cookie: cookieFrom(r), csrf: r.json.data.csrfToken, user: r.json.data.user };
}
function waitForSse(auth, eventName, trigger) {
  return new Promise(function (resolve, reject) {
    var settled = false, req;
    var timer = setTimeout(function () { if (!settled) { settled = true; try { req.destroy(); } catch (e) {} reject(new Error("SSE timeout: " + eventName)); } }, 5000);
    req = http.request({ host: "127.0.0.1", port: port, path: "/api/v1/events", method: "GET", headers: { Accept: "text/event-stream", Cookie: auth.cookie, Origin: "http://localhost:8080" } }, function (res) {
      assert(res.statusCode === 200, "SSE status " + res.statusCode);
      var buf = "";
      res.on("data", function (c) {
        buf += c.toString("utf8");
        if (buf.indexOf("event: " + eventName) >= 0 && !settled) {
          settled = true; clearTimeout(timer); try { req.destroy(); } catch (e) {} resolve(buf);
        }
      });
      setTimeout(function () { Promise.resolve().then(trigger).catch(reject); }, 120);
    });
    req.on("error", function (e) { if (!settled) { settled = true; clearTimeout(timer); reject(e); } });
    req.end();
  });
}

child.stdout.on("data", function (b) {
  var text = b.toString();
  if (text.indexOf("Moshaver | مشاور API started") >= 0 && !started) { started = true; run(); }
});
child.stderr.on("data", function (b) { process.stderr.write(b); });
child.on("exit", function (code) { if (!done) cleanup(code || 1); });

async function run() {
  try {
    var admin = await login("admin", "LearningAdmin123!", "http://localhost:8081");
    var createStudent = await request("POST", "/api/v1/admin/students", {
      name: "دانش‌آموز تست یادگیری",
      username: "learnstudent",
      password: "LearnStudent123!",
      grade: "دوازدهم",
      major: "انسانی",
    }, admin, "http://localhost:8081");
    assert(createStudent.status === 201, "student create: " + createStudent.text);
    var sid = createStudent.json.data.id;
    var student = await login("learnstudent", "LearnStudent123!", "http://localhost:8080");

    var quizCreate = await request("POST", "/api/v1/admin/quizzes", { title: "تمرین یادگیری", subject: "فلسفه", durationMinutes: 10 }, admin, "http://localhost:8081");
    assert(quizCreate.status === 201, "quiz create: " + quizCreate.text);
    var quizId = quizCreate.json.data.id;
    var qCreate = await request("POST", "/api/v1/admin/quizzes/" + quizId + "/questions", {
      question: "نمونه سؤال برای حلقه مرور",
      options: ["گزینه یک", "گزینه دو", "گزینه سه", "گزینه چهار"],
      correctOption: "b",
      explanation: "گزینه دو پاسخ صحیح است چون توضیح نمونه این را نشان می‌دهد.",
      book: "فلسفه ۲",
      chapter: "فصل اول",
      lesson: "درس دوم",
      topic: "استدلال",
      hint: "به تعریف استدلال در ابتدای درس برگرد.",
      sortOrder: 1,
    }, admin, "http://localhost:8081");
    assert(qCreate.status === 201, "question create: " + qCreate.text);
    var questionId = qCreate.json.data.id;
    var qEdit = await request("PATCH", "/api/v1/admin/questions/" + questionId, {
      question: "نمونه سؤال برای حلقه مرور", options: ["گزینه یک", "گزینه دو", "گزینه سه", "گزینه چهار"], correctOption: "b",
      explanation: "توضیح ویرایش‌شده پاسخ صحیح.", book: "فلسفه ۲", chapter: "فصل اول", lesson: "درس دوم", topic: "استدلال", hint: "هینت ویرایش‌شده برای مرور."
    }, admin, "http://localhost:8081");
    assert(qEdit.status === 200 && qEdit.json.data.hint.indexOf("ویرایش") >= 0, "question update: " + qEdit.text);

    var start = await request("POST", "/api/v1/quizzes/" + quizId + "/start", { deviceLabel: "Learning API Test" }, student, "http://localhost:8080");
    assert(start.status === 201, "quiz start: " + start.text);
    var submit = await request("POST", "/api/v1/quizzes/" + quizId + "/attempts", {
      runId: start.json.data.runId,
      answers: [{ questionId: questionId, selectedOption: "a", errorReason: "بی‌دقتی" }],
    }, student, "http://localhost:8080");
    assert(submit.status === 201 && submit.json.data.percent === 0, "quiz submit: " + submit.text);
    var attemptId = submit.json.data.attemptId;

    var history = await request("GET", "/api/v1/quizzes/history", null, student, "http://localhost:8080");
    assert(history.status === 200 && history.json.data.some(function (x) { return x.id === attemptId; }), "student history");
    var detail = await request("GET", "/api/v1/quizzes/history/" + attemptId, null, student, "http://localhost:8080");
    assert(detail.status === 200 && detail.json.data.answers[0].book === "فلسفه ۲", "student attempt detail metadata");
    assert(detail.json.data.answers[0].learningItemId, "wrong answer must auto-create learning item");

    var learning = await request("GET", "/api/v1/learning/items?limit=20", null, student, "http://localhost:8080");
    assert(learning.status === 200 && learning.json.data.length >= 1, "learning list");
    var itemId = learning.json.data[0].id;
    var edit = await request("PATCH", "/api/v1/learning/items/" + itemId, { note: "این نکته را با مثال کتاب مرور کنم.", hint: "اول تعریف را بخوان." }, student, "http://localhost:8080");
    assert(edit.status === 200 && edit.json.data.note.indexOf("مثال") >= 0, "learning note update");
    var review = await request("POST", "/api/v1/learning/items/" + itemId + "/review", { mastery: 4 }, student, "http://localhost:8080");
    assert(review.status === 200 && review.json.data.intervalDays >= 7, "adaptive review interval");
    var reviewHistory = await request("GET", "/api/v1/learning/items/" + itemId + "/reviews", null, student, "http://localhost:8080");
    assert(reviewHistory.status === 200 && reviewHistory.json.data.length === 1 && reviewHistory.json.data[0].newMastery === 4, "durable review history");

    var adminDetail = await request("GET", "/api/v1/admin/students/" + sid + "/attempts/" + attemptId, null, admin, "http://localhost:8081");
    assert(adminDetail.status === 200 && adminDetail.json.data.answers.length === 1, "admin attempt detail");
    var studentLearningSse = waitForSse(student, "learning.updated", async function () {
      var adminItem = await request("POST", "/api/v1/admin/students/" + sid + "/learning", {
        subject: "فلسفه", book: "فلسفه ۲", chapter: "فصل اول", lesson: "درس دوم",
        title: "مرور تکمیلی مشاور", note: "از روی مثال‌های کتاب دوباره حل شود.", dueDate: new Date().toISOString().slice(0, 10),
      }, admin, "http://localhost:8081");
      assert(adminItem.status === 201, "admin learning create: " + adminItem.text);
    });
    await studentLearningSse;

    var deactivate = await request("POST", "/api/v1/admin/students/" + sid + "/deactivate", {}, admin, "http://localhost:8081");
    assert(deactivate.status === 200 && deactivate.json.data.active === false, "student soft deactivate");
    var blocked = await request("POST", "/api/v1/auth/login", { username: "learnstudent", password: "LearnStudent123!" }, null, "http://localhost:8080");
    assert(blocked.status === 401, "deactivated account must not login");
    var activate = await request("POST", "/api/v1/admin/students/" + sid + "/activate", {}, admin, "http://localhost:8081");
    assert(activate.status === 200 && activate.json.data.active === true, "student reactivate");
    var archive = await request("DELETE", "/api/v1/admin/students/" + sid, null, admin, "http://localhost:8081");
    assert(archive.status === 200 && archive.json.data.archived === true, "student archive preserves history");

    console.log("LEARNING API TEST PASSED: student CRUD, attempt history/detail, auto-learning item, notes/hints, adaptive review, admin learning SSE, deactivate/reactivate");
    cleanup(0);
  } catch (e) {
    console.error("LEARNING API TEST FAILED:", e && e.stack ? e.stack : e);
    cleanup(1);
  }
}
setTimeout(function () { if (!started) { console.error("LEARNING API TEST FAILED: server did not start"); cleanup(1); } }, 15000);
