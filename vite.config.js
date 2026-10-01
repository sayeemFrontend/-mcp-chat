import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const EMBED_DEV_DIR = fileURLToPath(new URL("./.embed-dev/", import.meta.url));

// In dev, /embed.js (+ its source map) is the watch build written by `npm run dev:embed`; the prod build puts it
// in dist/ instead.
function serveDevEmbed() {
  return {
    name: "serve-dev-embed",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url.split("?")[0];
        if (path !== "/embed.js" && path !== "/embed.js.map") return next();
        res.setHeader("Content-Type", path.endsWith(".map") ? "application/json" : "text/javascript; charset=utf-8");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache");
        try {
          res.end(await readFile(EMBED_DEV_DIR + path.slice(1)));
        } catch {
          res.statusCode = 503;
          res.end('console.error("[mcp-chat] embed.js is not built yet - run `npm run dev:embed` (or wait for it).");');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveDevEmbed()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    // examples/react.html imports packages/react/dist, which would otherwise pick up that package's own React copy.
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    // The embed watch output and the React package aren't part of the app; don't reload on their changes.
    watch: { ignored: ["**/.embed-dev/**", "**/packages/**", "**/examples/**"] },
  },
});
