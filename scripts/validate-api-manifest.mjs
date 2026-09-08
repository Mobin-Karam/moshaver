import fs from "node:fs";
const file = new URL("../docs/api-migration-manifest.json", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const statuses = new Set(["missing","partial","complete","intentionally_changed","deprecated"]);
const integrations = new Set(["not_applicable","pending","partial","complete"]);
const required = ["feature","v1Route","v2Route","status","backendComplete","adminV2Integrated","studentAppV2Integrated","securityTests","behaviorDifferences"];
const errors = [], seen = new Set();
for (const [index,item] of manifest.features.entries()) {
  for (const key of required) if (!(key in item)) errors.push(`${index}: missing ${key}`);
  if (seen.has(item.feature)) errors.push(`${index}: duplicate ${item.feature}`); seen.add(item.feature);
  if (!statuses.has(item.status)) errors.push(`${index}: invalid status`);
  if (!integrations.has(item.adminV2Integrated) || !integrations.has(item.studentAppV2Integrated)) errors.push(`${index}: invalid integration state`);
  if (item.status === "complete" && !item.backendComplete) errors.push(`${index}: complete feature has incomplete backend`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`API migration manifest valid: ${manifest.features.length} features`);
