import { defineConfig } from "@playwright/test";

const baseURL = process.env.ADMIN_V2_E2E_BASE_URL || "http://127.0.0.1:8081";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
});
