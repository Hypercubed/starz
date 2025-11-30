import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    outDir: "docs",
    rollupOptions: {
      external: ["src/__tests__"],
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["./src/**/*.test.ts"],
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
