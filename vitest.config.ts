import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Rules tests share one emulator, so run files one at a time.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
