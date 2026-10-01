// Builds the Shadow DOM embed (src/embed/main.jsx) as one self-contained IIFE: React + chat UI + CSS -> embed.js.
//   vite build -c vite.embed.config.js                    -> dist/embed.js (after the app build, which empties dist/)
//   vite build -c vite.embed.config.js --mode development -> .embed-dev/embed.js, rebuilt on change (served by
//                                                            the dev server at /embed.js, see vite.config.js)
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const dev = mode === "development";
  const polling = process.env.CHOKIDAR_USEPOLLING === "true";
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    // Library builds leave process.env.NODE_ENV in React's code; a browser script has no `process`.
    define: { "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production") },
    publicDir: false,
    build: {
      outDir: dev ? ".embed-dev" : "dist",
      emptyOutDir: false,
      copyPublicDir: false,
      minify: !dev,
      sourcemap: dev,
      lib: {
        entry: fileURLToPath(new URL("./src/embed/main.jsx", import.meta.url)),
        formats: ["iife"],
        name: "McpChatEmbedBundle",
        fileName: () => "embed.js",
      },
      // Docker bind mounts on Windows/macOS don't deliver fs events, same reason as CHOKIDAR_USEPOLLING.
      // (Vite maps these chokidar-style options onto Rolldown's watcher.)
      watch: dev ? { chokidar: polling ? { usePolling: true, interval: 500 } : {} } : null,
    },
  };
});
