import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'frontend',  // Ensure Vite knows the project root
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});


