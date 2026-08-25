"use strict";

var assert = require("node:assert/strict");
var fs = require("fs");
var os = require("os");
var path = require("path");
var DatabaseSync = require("node:sqlite").DatabaseSync;
var migrations = require("../src/migrations");
var security = require("../src/security");
var createLearningService = require("../src/services/learning.service");

var file = path.join(os.tmpdir(), "moshaver-learning-test-" + process.pid + ".sqlite");
try { fs.unlinkSync(file); } catch (e) {}
var db = new DatabaseSync(file);
db.exec("PRAGMA foreign_keys=ON");
function now() { return new Date().toISOString(); }
migrations.runMigrations(db, now);
var t = now();
db.prepare("INSERT INTO students (id,name,grade,major,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").run("s1", "Student", "12", "humanities", t, t);
db.prepare("INSERT INTO quizzes (id,title,subject,duration_minutes,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").run("q1", "Exam", "Math", 20, t, t);
db.prepare("INSERT INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order,book,chapter,lesson,topic,hint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  .run("qq1", "q1", "2+2?", "3", "4", "5", "6", "b", "Because 2+2=4", 1, "Book", "Chapter 1", "Lesson 2", "Addition", "Think pairs");
db.prepare("INSERT INTO quiz_attempts (id,quiz_id,student_id,started_at,submitted_at,correct,wrong,blank,percent,duration_seconds) VALUES (?,?,?,?,?,?,?,?,?,?)")
  .run("a1", "q1", "s1", t, t, 0, 1, 0, 0, 30);
db.prepare("INSERT INTO quiz_answers (id,attempt_id,question_id,selected_option,is_correct,error_reason) VALUES (?,?,?,?,0,?)")
  .run("ans1", "a1", "qq1", "a", "concept");
var learning = createLearningService({ db: db, security: security, now: now, str: function (v, max) { return String(v == null ? "" : v).trim().slice(0, max || 9999); }, num: function (v, fallback) { var n = Number(v); return Number.isFinite(n) ? n : fallback; }, todayIso: function () { return new Date().toISOString().slice(0, 10); } });
var created = learning.ensureFromWrongAnswer("s1", "ans1", db.prepare("SELECT * FROM quiz_questions WHERE id='qq1'").get(), db.prepare("SELECT * FROM quizzes WHERE id='q1'").get());
assert.equal(created.book, "Book");
assert.equal(created.chapter, "Chapter 1");
assert.equal(learning.list("s1", { status: "pending" }).length, 1);
var reviewed = learning.complete("s1", created.id, { mastery: 4 });
assert.equal(reviewed.data.reviewCount, 1);
assert.equal(reviewed.data.status, "pending");
assert.ok(reviewed.data.intervalDays >= 7);
var summary = learning.summary("s1");
assert.equal(summary.totalItems, 1);
assert.equal(summary.attempts, 1);
console.log("LEARNING TEST PASSED");
db.close();
try { fs.unlinkSync(file); } catch (e) {}
