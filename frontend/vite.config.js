import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Either remove the root setting entirely or set it to '.'
  // root: '.',  // optional: '.' is the default when running in this folder
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});


