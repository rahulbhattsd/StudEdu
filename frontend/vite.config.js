import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: './frontend', // Adjusted to point to the correct subdirectory
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});


