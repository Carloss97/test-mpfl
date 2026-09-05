import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WASM_DIR = path.join(PROJECT_ROOT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const MEDIAPIPE_WASM_PREFIX = '/mediapipe/wasm/';
const ALLOWED_WASM_FILE = /^vision_wasm(?:_module|_nosimd)?_internal\.(?:js|wasm)$/;

function contentTypeFor(filePath) {
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  return 'application/octet-stream';
}

export function patchMediaPipeWasmLoader(source) {
  const additions = [];
  if (!source.includes('globalThis.ModuleFactory = ModuleFactory')) {
    additions.push('globalThis.ModuleFactory = ModuleFactory;');
  }
  if (!source.includes('self.ModuleFactory = ModuleFactory')) {
    additions.push("if (typeof self !== 'undefined') self.ModuleFactory = ModuleFactory;");
  }
  return additions.length === 0 ? source : `${source}\n;${additions.join('\n')}\n`;
}

function bodyFor(filePath) {
  if (!filePath.endsWith('.js')) return null;
  return patchMediaPipeWasmLoader(readFileSync(filePath, 'utf8'));
}

export function resolveMediaPipeWasmFile(requestUrl, wasmDir = DEFAULT_WASM_DIR) {
  const { pathname } = new URL(requestUrl ?? '', 'http://localhost');
  if (!pathname.startsWith(MEDIAPIPE_WASM_PREFIX)) return null;

  const requestedName = pathname.slice(MEDIAPIPE_WASM_PREFIX.length);
  const fileName = path.basename(requestedName);
  if (requestedName !== fileName || !ALLOWED_WASM_FILE.test(fileName)) return null;

  const filePath = path.join(wasmDir, fileName);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;

  return {
    filePath,
    contentType: contentTypeFor(filePath),
    body: bodyFor(filePath),
  };
}

export function mediaPipeWasmDevServerPlugin() {
  return {
    name: 'serve-mediapipe-wasm-before-vite-transform',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const asset = resolveMediaPipeWasmFile(req.url);
        if (!asset) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', asset.contentType);
        res.setHeader('Cache-Control', 'no-cache');
        if (asset.body !== null) {
          res.end(asset.body);
          return;
        }
        createReadStream(asset.filePath)
          .on('error', next)
          .pipe(res);
      });
    },
  };
}
