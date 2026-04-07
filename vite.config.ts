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
  plugins: [
    tailwindcss(),
    ...tanstackStart({
      srcDirectory: "app",
    }),
  ],
});
