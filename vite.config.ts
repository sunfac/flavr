import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Prevent top-level await in config
function getCartographerPlugin() {
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    return import("@replit/vite-plugin-cartographer").then((m) => [m.cartographer()]);
  }
  return Promise.resolve([]);
}

export default defineConfig(async () => {
  const cartographer = await getCartographerPlugin();

  return {
    root: path.resolve(__dirname, "client"),

    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...cartographer,
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },

    optimizeDeps: {
      exclude: [
        "lucide-react",
        "@tanstack/react-query",
        "@radix-ui/react-tooltip",
      ],
    },

    build: {
      outDir: path.resolve(__dirname, "server/public"),
      emptyOutDir: true,
    },
  };
});
