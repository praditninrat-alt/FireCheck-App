import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const config = defineConfig({
  resolve: { alias: { "@": resolve(dirname(fileURLToPath(import.meta.url)), "src") } },
  test: { environment: "node" },
});

export default config;
