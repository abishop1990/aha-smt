import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@config": path.resolve(__dirname, "aha-smt.config.ts"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "data"],
    mockReset: true,
    restoreMocks: true,
    setupFiles: ["./vitest.setup.ts"],
    benchmark: {
      include: ["benchmarks/**/*.bench.ts"],
    },
  },
});
