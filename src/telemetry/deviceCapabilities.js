/**
 * Device Capability Detection
 *
 * Detecta las capacidades del hardware del cliente para auto-configurar
 * parámetros de rendimiento: delegado GPU, tamaño de batch, fps objetivo,
 * y si usar Web Workers para el engine de inferencia.
 *
 * Diseñado para equipos de gama media con GPU (target principal).
 */

const GPU_TIER = Object.freeze({
  HIGH: 'high',       // GPU dedicada con ≥4GB VRAM estimada
  MID: 'mid',         // GPU integrada o dedicada de gama media
  LOW: 'low',         // GPU muy limitada o solo CPU
  NONE: 'none',       // Sin GPU detectada
});

const CPU_TIER = Object.freeze({
  HIGH: 'high',       // ≥8 cores lógicos
  MID: 'mid',         // 4-7 cores
  LOW: 'low',         // <4 cores
});

let _cachedCapabilities = null;

// ─── Detection helpers ───

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';

    // Estimate VRAM from MAX_TEXTURE_SIZE (rough heuristic)
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const estimatedVRAM = maxTexSize >= 16384 ? 8192
      : maxTexSize >= 8192 ? 4096
      : maxTexSize >= 4096 ? 2048
      : 1024;

    // Check for software renderers
    const isSoftware = /swiftshader|llvmpipe|softpipe|microsoft basic render/i.test(renderer);

    return { renderer, vendor, estimatedVRAM, maxTexSize, isSoftware, glVersion: gl instanceof WebGL2RenderingContext ? 2 : 1 };
  } catch {
    return null;
  }
}

function detectCPU() {
  const cores = navigator.hardwareConcurrency || 4;
  // Estimate memory via performance API
  let estimatedRAM = 4096; // default guess
  if ('deviceMemory' in navigator) {
    estimatedRAM = navigator.deviceMemory * 1024; // GB → MB
  }
  return { cores, estimatedRAM };
}

function classifyGPUTier(webgl) {
  if (!webgl || webgl.isSoftware) return GPU_TIER.NONE;
  if (webgl.estimatedVRAM >= 4096 && webgl.glVersion >= 2) return GPU_TIER.HIGH;
  if (webgl.estimatedVRAM >= 2048 && webgl.glVersion >= 2) return GPU_TIER.MID;
  if (webgl.estimatedVRAM >= 1024) return GPU_TIER.LOW;
  return GPU_TIER.NONE;
}

function classifyCPUTier(cpu) {
  if (cpu.cores >= 8) return CPU_TIER.HIGH;
  if (cpu.cores >= 4) return CPU_TIER.MID;
  return CPU_TIER.LOW;
}

// ─── Recommended config generator ───

function buildRecommendedConfig(caps) {
  const { gpuTier, cpuTier, cpu } = caps;

  // Default: CPU-only safe config
  const config = {
    mediapipeDelegate: 'CPU',
    fpsTarget: 15,
    useEdgeAIWorker: false,
    edgeAIBatchSize: 1,
    maxFaceSamples: 300,
    reason: '',
  };

  if (gpuTier === GPU_TIER.HIGH) {
    config.mediapipeDelegate = 'GPU';
    config.fpsTarget = 30;
    config.useEdgeAIWorker = true;
    config.edgeAIBatchSize = 4;
    config.maxFaceSamples = 900;
    config.reason = 'GPU dedicada ≥4GB detectada — máxima calidad.';
  } else if (gpuTier === GPU_TIER.MID) {
    config.mediapipeDelegate = 'GPU';
    config.fpsTarget = 25;
    config.useEdgeAIWorker = cpu.cores >= 4;
    config.edgeAIBatchSize = 2;
    config.maxFaceSamples = 600;
    config.reason = 'GPU de gama media detectada — calidad balanceada.';
  } else if (gpuTier === GPU_TIER.LOW) {
    config.mediapipeDelegate = 'GPU';
    config.fpsTarget = 15;
    config.useEdgeAIWorker = false;
    config.edgeAIBatchSize = 1;
    config.maxFaceSamples = 400;
    config.reason = 'GPU limitada detectada — modo conservador.';
  } else {
    // No GPU: CPU-only
    config.reason = `Sin GPU utilizable (${cpu.cores} cores CPU) — modo CPU.`;
    if (cpuTier === CPU_TIER.HIGH) {
      config.fpsTarget = 20;
      config.maxFaceSamples = 500;
      config.useEdgeAIWorker = true;
    } else if (cpuTier === CPU_TIER.MID) {
      config.fpsTarget = 15;
      config.maxFaceSamples = 300;
    } else {
      config.fpsTarget = 10;
      config.maxFaceSamples = 200;
    }
  }

  return config;
}

// ─── Public API ───

/**
 * Detecta las capacidades del dispositivo (cacheado).
 * @returns {Object} Capacidades detectadas + config recomendada
 */
export function getDeviceCapabilities() {
  if (_cachedCapabilities) return _cachedCapabilities;

  const webgl = detectWebGL();
  const cpu = detectCPU();
  const gpuTier = classifyGPUTier(webgl);
  const cpuTier = classifyCPUTier(cpu);

  const caps = {
    webgl,
    cpu,
    gpuTier,
    cpuTier,
    hasGPU: gpuTier !== GPU_TIER.NONE,
    hasWebGL2: webgl?.glVersion >= 2,
    recommended: buildRecommendedConfig({ gpuTier, cpuTier, cpu }),
    detectedAt: Date.now(),
  };

  _cachedCapabilities = caps;
  return caps;
}

/**
 * Forzar re-detección (útil tras cambio de configuración).
 */
export function resetCapabilities() {
  _cachedCapabilities = null;
}

/**
 * Obtiene solo la config recomendada (sin detalles de hardware).
 */
export function getRecommendedConfig() {
  return getDeviceCapabilities().recommended;
}

// Named exports for tiers
export { GPU_TIER, CPU_TIER };