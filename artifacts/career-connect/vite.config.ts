import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Frontend dev server port (default 5173, separate from API server port)
const frontendPort = Number(process.env.FRONTEND_PORT ?? 5173);

// API server port - must match what api-server is listening on
const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 8081);

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Replit-only plugins: only load when running on Replit
    ...(process.env.REPL_ID !== undefined
      ? [
          ...(process.env.NODE_ENV !== "production"
            ? [
                await import("@replit/vite-plugin-runtime-error-modal").then(
                  (m) => m.default()
                ),
                await import("@replit/vite-plugin-cartographer").then((m) =>
                  m.cartographer({
                    root: path.resolve(import.meta.dirname, ".."),
                  })
                ),
                await import("@replit/vite-plugin-dev-banner").then((m) =>
                  m.devBanner()
                ),
              ]
            : []),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets"
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: frontendPort,
    strictPort: false,
    host: "0.0.0.0",
    proxy: {
      // Proxy /api requests to the Express API server
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        rewrite: (path) => path, // Keep path as-is (Express handles /api prefix)
      },
    },
  },
  preview: {
    port: frontendPort,
    host: "0.0.0.0",
  },
});
