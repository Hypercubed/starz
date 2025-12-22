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
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:1999/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
});
