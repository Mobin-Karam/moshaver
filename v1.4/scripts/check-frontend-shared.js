"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var sharedFiles = [
  {
    canonical: path.join(root, "frontend-shared", "api-client.js"),
    asset: "api-client.shared.js",
    copies: [
      path.join(root, "admin-app", "js", "api-client.shared.js"),
      path.join(root, "student-app", "js", "api-client.shared.js"),
    ],
  },
  {
    canonical: path.join(root, "frontend-shared", "ui-utils.js"),
    asset: "ui-utils.shared.js",
    copies: [
      path.join(root, "admin-app", "js", "ui-utils.shared.js"),
      path.join(root, "student-app", "js", "ui-utils.shared.js"),
    ],
  },
];
var filesWithReferences = [
  path.join(root, "admin-app", "index.html"),
  path.join(root, "student-app", "index.html"),
  path.join(root, "admin-app", "sw.js"),
  path.join(root, "student-app", "sw.js"),
  path.join(root, "admin-app", "sw.template.js"),
  path.join(root, "student-app", "sw.template.js"),
];
var cssTokenFiles = [
  path.join(root, "admin-app", "css", "admin.css"),
  path.join(root, "student-app", "css", "app.css"),
];
var frontendModuleDirs = [
  path.join(root, "admin-app", "js", "core"),
  path.join(root, "admin-app", "js", "views"),
  path.join(root, "admin-app", "js", "components"),
  path.join(root, "admin-app", "js", "utils"),
  path.join(root, "student-app", "js", "core"),
  path.join(root, "student-app", "js", "views"),
  path.join(root, "student-app", "js", "components"),
  path.join(root, "student-app", "js", "utils"),
];
var appScripts = [
  path.join(root, "admin-app", "js", "admin.js"),
  path.join(root, "student-app", "js", "app.js"),
];
var requiredCssTokens = [
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--font-sm",
  "--font-md",
  "--font-lg",
];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

sharedFiles.forEach(function (shared) {
  var canonicalText = read(shared.canonical);
  shared.copies.forEach(function (copy) {
    assert(read(copy) === canonicalText, copy + " differs from " + shared.canonical);
  });
  filesWithReferences.forEach(function (file) {
    assert(
      read(file).indexOf(shared.asset) >= 0,
      file + " does not reference " + shared.asset,
    );
  });
});
cssTokenFiles.forEach(function (file) {
  var css = read(file);
  requiredCssTokens.forEach(function (token) {
    assert(css.indexOf(token + ":") >= 0, file + " is missing " + token);
  });
});
frontendModuleDirs.forEach(function (dir) {
  assert(fs.existsSync(dir) && fs.statSync(dir).isDirectory(), dir + " is missing");
});
appScripts.forEach(function (file) {
  assert(
    !/function toast\([^)]*\)\{[^}]*innerHTML\s*=/.test(read(file)),
    file + " must delegate toast rendering to shared safe UI utility",
  );
});

console.log("frontend shared checks passed");
