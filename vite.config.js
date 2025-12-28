import { defineConfig } from "vitest/config";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command, mode }) => {
  console.log(`Vite command: ${command}, mode: ${mode}`);
  return {
    base: "./",
    test: {
      globals: true,
      environment: "happy-dom",
      include: ["./src/__tests__/*.test.ts"],
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
    plugins: command === 'serve' && mode !== 'test' ? [cloudflare()] : []
  }
});
