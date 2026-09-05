import { describe, expect, it } from 'vitest';
import { mediaPipeWasmDevServerPlugin, resolveMediaPipeWasmFile } from './mediapipeWasmPlugin.js';

describe('MediaPipe WASM Vite middleware', () => {
  it('resolves MediaPipe wasm loader requests even when Vite dynamic import adds ?import', () => {
    const asset = resolveMediaPipeWasmFile('/mediapipe/wasm/vision_wasm_internal.js?import');

    expect(asset).toMatchObject({ contentType: 'text/javascript; charset=utf-8' });
    expect(asset.filePath).toMatch(/node_modules[\\/]@mediapipe[\\/]tasks-vision[\\/]wasm[\\/]vision_wasm_internal\.js$/);
  });

  it('patches JS loader content so dynamic import in module workers publishes global ModuleFactory', () => {
    const asset = resolveMediaPipeWasmFile('/mediapipe/wasm/vision_wasm_internal.js?import');

    expect(asset.body).toContain('globalThis.ModuleFactory = ModuleFactory');
    expect(asset.body).toContain('self.ModuleFactory = ModuleFactory');
  });

  it('serves wasm binaries with application/wasm content type', () => {
    const asset = resolveMediaPipeWasmFile('/mediapipe/wasm/vision_wasm_internal.wasm?import');

    expect(asset).toMatchObject({ contentType: 'application/wasm' });
    expect(asset.body).toBeNull();
  });

  it('rejects traversal and non-MediaPipe filenames', () => {
    expect(resolveMediaPipeWasmFile('/mediapipe/wasm/../package.json?import')).toBeNull();
    expect(resolveMediaPipeWasmFile('/mediapipe/wasm/random.js?import')).toBeNull();
    expect(resolveMediaPipeWasmFile('/other/vision_wasm_internal.js?import')).toBeNull();
  });

  it('registers a dev-server middleware before Vite transform handling', () => {
    const plugin = mediaPipeWasmDevServerPlugin();

    expect(plugin.name).toBe('serve-mediapipe-wasm-before-vite-transform');
    expect(typeof plugin.configureServer).toBe('function');
  });
});
