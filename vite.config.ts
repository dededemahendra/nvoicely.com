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
    // Pre-bundle react-pdf so esbuild converts it and its CJS deps (base64-js,
    // etc.) to proper ESM — excluding it broke the default-export interop.
    include: ["@react-pdf/renderer"],
  },
  plugins: [
    tailwindcss(),
    ...tanstackStart({
      srcDirectory: "app",
    }),
  ],
});
