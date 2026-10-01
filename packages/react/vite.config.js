import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Library build: ESM + CJS, React left to the consumer (peer dependency).
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL("./src/index.js", import.meta.url)),
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rolldownOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/],
      // Next.js app router: the component uses hooks and window, so mark the module as a client component.
      output: { banner: '"use client";' },
    },
  },
});
