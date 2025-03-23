import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname), // Absolute path to frontend/
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  rollupOptions: {
    external: ['react-rating'] // Only needed if intentionally excluding
  }
});
