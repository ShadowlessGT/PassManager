import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', rollupOptions: { input: { app: 'index.html', accountDeletion: 'delete-account.html' } } },
  server: { host: '0.0.0.0' },
  test: { exclude: [...configDefaults.exclude, 'functions/**'] }
});
