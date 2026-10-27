import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(process.cwd(), 'site'),
  envDir: process.cwd(),
  publicDir: false,
  build: {
    target: 'es2022',
    outDir: resolve(process.cwd(), 'site-dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), 'site/index.html'),
        privacy: resolve(process.cwd(), 'site/privacy.html'),
        terms: resolve(process.cwd(), 'site/terms.html'),
        deletion: resolve(process.cwd(), 'site/delete-account.html')
      }
    }
  }
});