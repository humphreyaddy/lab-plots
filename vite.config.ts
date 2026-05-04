/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build a relative-base bundle so the production output runs from file:// too.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
  },
});
