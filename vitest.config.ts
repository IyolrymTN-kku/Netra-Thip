import path from "node:path";
import type { ViteUserConfigExport } from "vitest/config";

const config = {
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    css: false,
  },
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-shim.ts"),
    },
  },
} satisfies ViteUserConfigExport;

export default config;
