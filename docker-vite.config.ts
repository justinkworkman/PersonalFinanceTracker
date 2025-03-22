import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";

// Docker-specific Vite config that avoids relative path issues
export default defineConfig({
  plugins: [
    react(),
    themePlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve("/app/client/src"),
      "@shared": path.resolve("/app/shared"),
    },
  },
  root: path.resolve("/app/client"),
  build: {
    outDir: path.resolve("/app/client/dist"),
    emptyOutDir: true,
  },
});