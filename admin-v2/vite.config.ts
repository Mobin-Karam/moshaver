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
      server.middlewares.use("/api", (req, res, next) => {
        const target = backendTargets[selectedBackend(req.headers.cookie)];
        const originalUrl =
          (req as typeof req & { originalUrl?: string }).originalUrl || req.url || "";
        if (!/^\/api\/v[12](?:\/|$)/.test(originalUrl)) {
          next();
          return;
        }
        const path = originalUrl;
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
          if (res.headersSent) return;
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              ok: false,
              error: { code: "PROXY_ERROR", message: "Backend proxy error" },
            }),
          );
        });
        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [devBackendProxy(), react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          if (id.includes("node_modules/react-router")) return "router";
          if (id.includes("node_modules/@tanstack/")) return "query";
          if (/node_modules\/(lucide-react|react-multi-date-picker|@persian-tools)\//.test(id))
            return "ui";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 8081,
    strictPort: true,
  },
});
