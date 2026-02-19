import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    // lovable-tagger is dev-only and loaded conditionally so production
    // builds on servers without devDependencies don't fail.
    mode === 'development'
      ? (() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
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
  optimizeDeps: {
    include: ['lodash', 'recharts', 'jspdf'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI component library
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-switch',
          ],
          // Charts
          'vendor-recharts': ['recharts'],
          // PDF generation (heavy — split out)
          'vendor-pdf': ['jspdf'],
          // Form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Tanstack query
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
}));
