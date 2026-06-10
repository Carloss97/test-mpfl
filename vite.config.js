import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mediaPipeWasmDevServerPlugin } from './mediapipeWasmPlugin.js';

export default defineConfig({
  plugins: [mediaPipeWasmDevServerPlugin(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: true,
  },
});
