import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: mode === 'development' && process.env.VITE_DEV_API_PROXY_TARGET
      ? {
          '/api': {
            target: process.env.VITE_DEV_API_PROXY_TARGET,
            changeOrigin: true,
          },
        }
      : undefined,
  },
  plugins: [
    react(),
    mode === 'development'
      ? (() => {
          try {
            const { componentTagger } = require('lovable-tagger');
            return componentTagger();
          } catch {
            return null;
          }
        })()
      : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
}));
