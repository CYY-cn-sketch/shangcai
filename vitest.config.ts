import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/api/auth.ts", "src/authViews.tsx", "src/studentAvatars.ts"],
      thresholds: {
        branches: 25,
        functions: 25,
        lines: 25,
        statements: 25,
      },
    },
  },
});
