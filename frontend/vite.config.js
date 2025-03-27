import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Set the root as the current directory (frontend folder)
  root: path.resolve(__dirname),
  build: {
    // Output the built files into the "dist" folder within the frontend directory
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    // Listen on all interfaces (useful for remote debugging and deployment)
    host: '0.0.0.0',
    port: 5173,
  }
});

