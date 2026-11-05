import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    testTimeout: 40000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    conditions: ["react-server", "node", "import"],
  },
});
