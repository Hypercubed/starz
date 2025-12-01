import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    outDir: "docs"
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["./__tests__/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "*.config.*",
        "./docs/"
      ],
    },
  },
});
