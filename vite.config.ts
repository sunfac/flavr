import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Define conditional Cartographer plugin for Replit
const cartographerPlugin = async () => {
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    return [cartographer()];
  }
  return [];
};

export default defineConfig(async () => ({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(await cartographerPlugin()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  optimizeDeps: {
    exclude: [
      "lucide-react",
      "@tanstack/react-query",
      "@radix-ui/react-tooltip"
    ],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "server/public"),
    emptyOutDir: true,
  },
}));
