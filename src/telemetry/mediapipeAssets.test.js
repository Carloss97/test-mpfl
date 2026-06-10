import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MEDIAPIPE_ASSETS, getFaceLandmarkerOptions } from './mediapipeAssets.js';

describe('MEDIAPIPE_ASSETS', () => {
  it('uses locally served WASM assets to avoid ModuleFactory resolution failures from CDN workers', () => {
    expect(MEDIAPIPE_ASSETS.wasmBaseUrl).toBe('/mediapipe/wasm');
    expect(MEDIAPIPE_ASSETS.wasmBaseUrl).not.toMatch(/cdn|latest/i);
  });

  it('keeps production public WASM loaders patched for module-worker dynamic imports', () => {
    for (const name of [
      'vision_wasm_internal.js',
      'vision_wasm_module_internal.js',
      'vision_wasm_nosimd_internal.js',
    ]) {
      const loader = readFileSync(`${process.cwd()}/public/mediapipe/wasm/${name}`, 'utf8');
      expect(loader).toContain('globalThis.ModuleFactory = ModuleFactory');
      expect(loader).toContain('self.ModuleFactory = ModuleFactory');
    }
  });

  it('builds Face Landmarker options without storing landmarks or raw media', () => {
    expect(getFaceLandmarkerOptions('CPU')).toMatchObject({
      baseOptions: {
        delegate: 'CPU',
        modelAssetPath: expect.stringContaining('face_landmarker.task'),
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
  });
});
