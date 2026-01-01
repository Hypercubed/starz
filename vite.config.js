import { defineConfig } from "vitest/config";
import { cloudflare } from "@cloudflare/vite-plugin";
import { version } from './package.json';

const NODE_ENV = process.env.NODE_ENV || 'development';
const ENV = NODE_ENV === 'production' ? '' : '-dev';
const VERSION = `v${version}${ENV}`;

export default defineConfig(({ command, mode }) => {
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
    define: {
      __APP_VERSION__: JSON.stringify(VERSION)
    },
    plugins: command === 'serve' && mode !== 'test' ? [cloudflare()] : []
  }
});
