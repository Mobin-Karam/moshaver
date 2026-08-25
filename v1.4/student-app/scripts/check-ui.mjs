import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "css", "app.css"), "utf8");
const sourceDir=resolve(root,"css","src"),sourceFiles=(await readdir(sourceDir)).filter((x)=>x.endsWith(".css"));
const sourceCss=(await Promise.all(sourceFiles.map((x)=>readFile(resolve(sourceDir,x),"utf8")))).join("\n");

const requiredHtml = [
  'href="./css/app.css?v=',
  'class="chat-presence reconnecting"',
  'viewport-fit=cover',
  'role="dialog"',
  'class="sr-only"',
];
for (const token of requiredHtml) {
  if (!html.includes(token)) throw new Error(`Missing HTML token: ${token}`);
}

const requiredCss = [
  '.offline-bar:not(.hidden) ~ .app .chat-view.active',
  '.sr-only',
  'input:not([type="range"])',
  '.telegram-chat-head .chat-presence',
  '.learning-summary-grid',
  '.attempt-history-card',
];
for (const token of requiredCss) {
  if (!css.includes(token)) throw new Error(`Missing CSS token: ${token}`);
}
for(const token of ["--font-xs","--font-base","--font-2xl","--line-relaxed",".quiz-question-map",".quiz-submit-review"]){if(!css.includes(token))throw new Error(`Missing typography/exam token: ${token}`);}
const tiny=[...sourceCss.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter((m)=>Number(m[1])<12);
if(tiny.length)throw new Error(`Meaningful typography below 12px remains: ${tiny.map((m)=>m[0]).join(", ")}`);
if(!/input[^}]*font-size:\s*16px|font-size:\s*16px[^}]*line-height:\s*1\.5/s.test(sourceCss))throw new Error("16px mobile form-control typography is missing");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) throw new Error(`Duplicate HTML ids: ${[...new Set(dupes)].join(", ")}`);

console.log("UI integrity check passed.");
