import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "app"),
    },
  },
  optimizeDeps: {
    // @react-pdf/renderer v4 uses yoga-wasm internally — Vite's pre-bundler
    // can't handle WASM modules, so we exclude it and let it load natively.
    exclude: ["@react-pdf/renderer"],
  },
  plugins: [
    tailwindcss(),
    ...tanstackStart({
      srcDirectory: "app",
    }),
  ],
});
