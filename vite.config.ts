import { defineConfig } from 'vite';

// base relativa: funciona en GitHub Pages bajo /<repo>/ y en local.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
  },
} as any);
