import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const files = [
  "01-tokens.css",
  "02-base.css",
  "03-layout.css",
  "04-components.css",
  "05-today.css",
  "06-schedule.css",
  "07-exams.css",
  "08-chat.css",
  "09-learning.css",
  "10-modals.css",
  "11-dark.css",
  "12-responsive.css",
];

const chunks = [];
for (const file of files) {
  chunks.push(await readFile(resolve(root, "css", "src", file), "utf8"));
}

const banner = "/* GENERATED FILE — edit css/src/*.css, then run: node scripts/build-css.mjs */\n\n";
const output=banner+chunks.join("\n"),target=resolve(root,"css","app.css");
if(process.argv.includes("--check")){let current="";try{current=await readFile(target,"utf8");}catch(e){}if(current!==output){console.error("css/app.css is stale; run node scripts/build-css.mjs");process.exitCode=1;}else console.log("PASS generated student CSS is current");}
else{await writeFile(target,output,"utf8");console.log(`Built css/app.css from ${files.length} source files.`);}
