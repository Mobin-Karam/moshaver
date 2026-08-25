"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "../..");
var admin = path.join(root, "admin-app/js");
var student = path.join(root, "student-app/js");
var files = ["api-client.shared.js", "ui-utils.shared.js"];

if (!fs.existsSync(admin) || !fs.existsSync(student)) {
  console.log("frontend shared check skipped: sibling admin-app/student-app are not present in this standalone backend package");
  process.exit(0);
}

files.forEach(function (name) {
  var a = fs.readFileSync(path.join(admin, name), "utf8");
  var b = fs.readFileSync(path.join(student, name), "utf8");
  if (a !== b) throw new Error(name + " differs between admin-app and student-app");
});
console.log("frontend shared check passed");
