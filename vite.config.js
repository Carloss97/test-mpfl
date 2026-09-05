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
    // La BFS de mínimo de movimientos de Laser (laserPuzzleTelemetry) tarda
    // >5s en la Raspberry Pi (4 cores); el default 5s rompía el gate R-7A.
    testTimeout: 30000,
  },
});
