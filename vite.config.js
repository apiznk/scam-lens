import { defineConfig } from 'vite';

export default defineConfig({
  // Firebase Hosting: https://scamlens-9dfe6.web.app/ (served at root).
  // (Was '/scam-lens/' for GitHub Pages; hosting moved 27 Nov 2026.)
  base: '/',
  build: {
    outDir: 'dist',
  },
});
