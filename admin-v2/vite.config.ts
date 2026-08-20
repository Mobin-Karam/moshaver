import http from "node:http";
import https from "node:https";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backendTargets = {
  local: "http://localhost:4000",
  remote: "https://api.mahakaram.ir",
} as const;

function selectedBackend(cookieHeader = "") {
  const match = cookieHeader.match(/(?:^|;\s*)moshaver_admin_backend=(local|remote)(?:;|$)/);
  return match?.[1] === "remote" ? "remote" : "local";
}

function devBackendProxy() {
  return {
    name: "dev-backend-proxy",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/v1", (req, res) => {
        const target = backendTargets[selectedBackend(req.headers.cookie)];
        const originalUrl = (req as typeof req & { originalUrl?: string }).originalUrl || req.url || "";
        const path = originalUrl.startsWith("/api/v1") ? originalUrl : `/api/v1${originalUrl}`;
        const upstreamUrl = new URL(path, target);
        const client = upstreamUrl.protocol === "https:" ? https : http;
        const proxyReq = client.request(
          upstreamUrl,
          {
            method: req.method,
            headers: {
              ...req.headers,
              host: upstreamUrl.host,
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res);
          },
        );
        proxyReq.on("error", () => {
          res.statusCode = 502;
          res.end("Backend proxy error");
        });
        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [devBackendProxy(), react()],
  server: {
    port: 8081,
    strictPort: true,
  },
});
