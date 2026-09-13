import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/app/layout/admin-navigation.ts",
        "src/features/auth/lib/auth-session.ts",
        "src/features/auth/model/login.schema.ts",
        "src/features/chat/model/permissions.ts",
        "src/features/exams/model/exam-model.ts",
        "src/features/learning/model/learning-model.ts",
        "src/features/notifications/lib/api-error.ts",
        "src/features/notifications/lib/notification-utils.ts",
        "src/features/notifications/model/notification-model.ts",
        "src/features/questions/model/question-model.ts",
        "src/features/students/components/student-ui.ts",
        "src/shared/errors/error-utils.ts",
        "src/shared/lib/utils.ts",
      ],
      thresholds: {
        branches: 70,
        functions: 75,
        lines: 80,
      },
    },
  },
});
