#!/usr/bin/env node

const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:8080");

async function fetchChecked(path, expectedType) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "error",
    headers: { Accept: expectedType },
  });
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${body.slice(0, 160)}`);
  }
  if (!contentType.toLowerCase().includes(expectedType)) {
    throw new Error(`${path} returned ${contentType || "no content type"}; expected ${expectedType}`);
  }
  return { response, body };
}

const root = await fetchChecked("/", "text/html");
if (!root.body.includes("Moshaver Student v2")) {
  throw new Error("Student root is not the v2 artifact (expected the Moshaver Student v2 marker)");
}

const directRoute = await fetchChecked("/more", "text/html");
if (!directRoute.body.includes("Moshaver Student v2")) {
  throw new Error("Student direct-route fallback did not return the v2 application shell");
}

const openapi = await fetchChecked("/api/v2/openapi.json", "application/json");
try {
  const document = JSON.parse(openapi.body);
  if (!document.openapi || !document.paths) throw new Error("missing OpenAPI fields");
} catch (error) {
  throw new Error(`Student API proxy returned invalid OpenAPI JSON: ${error.message}`);
}

const serviceWorker = await fetchChecked("/sw.js", "application/javascript");
const cacheControl = serviceWorker.response.headers.get("cache-control") || "";
if (!/no-cache|no-store/i.test(cacheControl)) {
  throw new Error(`Service worker can be served stale (Cache-Control: ${cacheControl || "missing"})`);
}

console.log(`Student production verification passed: ${baseUrl.origin}`);
