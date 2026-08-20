const localCorsOrigins = [
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
];

const productionCorsOrigins = ["https://st.mahakaram.ir", "https://admin.mahakaram.ir"];

export default () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS, process.env.NODE_ENV === "production" ? productionCorsOrigins : localCorsOrigins),
});

function parseCorsOrigins(value: string | undefined, fallback: string[]) {
  return Array.from(
    new Set(
      (value ? value.split(",") : fallback)
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => origin.replace(/\/+$/, "")),
    ),
  );
}
