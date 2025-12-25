import { defineConfig } from "vitest/config";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command, mode }) => ({
  base: "./",
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
  plugins: command === 'serve' ? [cloudflare()] : []
}));
