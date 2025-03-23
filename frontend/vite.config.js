import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Key fix: Current directory (frontend/)
  build: {
    outDir: 'dist', // Output to frontend/dist (not root-level)
    emptyOutDir: true,
  },
});

