// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom", // or 'node', 'browser', etc.
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"], // Specify your test files
  },
});
