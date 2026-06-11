import { FACE_CONNECTIONS } from './faceMeshTopology.js';

const REGION_COLORS = { upper: [116, 167, 255], mid: [255, 209, 102], lower: [77, 212, 172], jaw: [77, 212, 172] };
const REGION_LABELS = { upper: 'Upper', mid: 'Mid', lower: 'Lower', jaw: 'Jaw' };
const AU_REGION_INDICES = {
  upper: [33, 41, 48, 55, 62, 70, 77, 84, 91, 98, 103, 109, 116, 123, 130, 137, 144, 151, 158],
  mid: [33, 160, 158, 156, 154, 153, 145, 144, 163, 362, 387, 385, 383, 381, 380, 374, 373, 390],
  lower: [61, 67, 73, 79, 85, 91, 95, 99, 103, 106, 109, 113, 117, 121, 125, 129, 132, 135, 138, 141, 144, 147],
  jaw: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
};

export default class FaceMeshOverlay {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'face-mesh-overlay';
    this.canvas.setAttribute('aria-label', 'Facial landmarks');
    this.ctx = this.canvas.getContext('2d');
    this.landmarks = null;
    this.auActivation = {};
    this.quality = {};
    this.gaze = null;
    this.smoothed = null;
    this.visible = true;
    this.rafId = null;
    this.alpha = 0.35;
    this._mounted = false;
    this._draw = this._draw.bind(this);
  }
  mount() {
    if (this._mounted) return;
    this.container.appendChild(this.canvas);
    this._observer = new ResizeObserver(() => this._resize());
    this._observer.observe(this.container);
    this._resize();
    this._mounted = true;
    this._rafId = requestAnimationFrame(this._draw);
  }
  unmount() {
    this._mounted = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._observer) { this._observer.disconnect(); this._observer = null; }
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
  update({ landmarks, auRegionActivation, visible, quality, gaze }) {
    if (landmarks !== undefined) this.landmarks = landmarks;
    if (auRegionActivation !== undefined) this.auActivation = auRegionActivation;
    if (visible !== undefined) this.visible = visible;
    if (quality !== undefined) this.quality = quality;
    if (gaze !== undefined) this.gaze = gaze;
    this.canvas.style.display = this.visible ? '' : 'none';
  }
  _resize() {
    const r = this.container.getBoundingClientRect();
    const w = Math.floor(r.width), h = Math.floor(r.height);
    if (w > 0 && h > 0 && (this.canvas.width !== w || this.canvas.height !== h)) {
      this.canvas.width = w; this.canvas.height = h;
    }
  }
  _smooth(current) {
    if (!this.smoothed || this.smoothed.length !== current.length) {
      this.smoothed = new Float32Array(current);
      return this.smoothed;
    }
    const a = this.alpha;
    for (let i = 0; i < current.length; i++) this.smoothed[i] = this.smoothed[i] * a + current[i] * (1 - a);
    return this.smoothed;
  }
  _draw() {
    if (!this._mounted) return;
    this._rafId = requestAnimationFrame(this._draw);
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    if (cw <= 0 || ch <= 0 || !this.visible) return;
    ctx.fillStyle = '#050d18';
    ctx.fillRect(0, 0, cw, ch);
    const landmarks = this.landmarks;
    if (!landmarks || landmarks.length < 3) {
      ctx.fillStyle = '#9fb0c2'; ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('Esperando detección facial...', cw / 2, ch / 2);
      return;
    }
    const smoothed = this._smooth(landmarks);
    const count = smoothed.length / 3;
    const points = [];
    for (let i = 0; i < count; i++) points.push({ x: smoothed[i * 3] * cw, y: smoothed[i * 3 + 1] * ch });
    const au = this.auActivation;

    // Region glows
    for (const [region, indices] of Object.entries(AU_REGION_INDICES)) {
      const act = au[region] ?? 0;
      if (act < 0.03) continue;
      const [r, g, b] = REGION_COLORS[region];
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.55, act * 0.7)})`;
      ctx.beginPath();
      if (indices[0] < points.length) ctx.moveTo(points[indices[0]].x, points[indices[0]].y);
      for (let j = 1; j < indices.length; j++) {
        if (indices[j] < points.length) ctx.lineTo(points[indices[j]].x, points[indices[j]].y);
      }
      ctx.closePath(); ctx.fill();
    }

    // Connections
    ctx.strokeStyle = 'rgba(77,212,172,0.25)'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (const [a, b] of FACE_CONNECTIONS) {
      if (a < points.length && b < points.length) { ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y); }
    }
    ctx.stroke();

    // Iris
    ctx.fillStyle = 'rgba(116,167,255,0.65)';
    for (let i = 468; i <= 477 && i < points.length; i++) {
      ctx.beginPath(); ctx.arc(points[i].x, points[i].y, 2.0, 0, Math.PI * 2); ctx.fill();
    }
    // Points
    ctx.fillStyle = 'rgba(77,212,172,0.35)';
    for (let i = 0; i < points.length; i++) {
      if (i >= 468 && i <= 477) continue;
      ctx.beginPath(); ctx.arc(points[i].x, points[i].y, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    // Posture keypoints: ears, nose, chin, cheeks
    const posturePts = [1, 10, 152, 234, 454, 123, 352]; // nose tip, glabella, gnathion, ears, cheeks
    ctx.fillStyle = 'rgba(255,150,77,0.7)';
    for (const idx of posturePts) {
      if (idx < points.length) {
        ctx.beginPath(); ctx.arc(points[idx].x, points[idx].y, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Lines connecting posture points
    ctx.strokeStyle = 'rgba(255,150,77,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (234 < points.length && 454 < points.length) {
      ctx.moveTo(points[234].x, points[234].y);
      ctx.lineTo(points[454].x, points[454].y); // ear-to-ear
    }
    if (10 < points.length && 152 < points.length) {
      ctx.moveTo(points[10].x, points[10].y);
      ctx.lineTo(points[152].x, points[152].y); // forehead-to-chin
    }
    ctx.stroke();

    // Gaze indicator — always draw if gaze data exists
    if (this.gaze) {
      const gx = this.gaze.screenX * cw, gy = this.gaze.screenY * ch;
      ctx.strokeStyle = this.gaze.lookingAtScreen ? 'rgba(255,209,102,0.7)' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = this.gaze.lookingAtScreen ? 'rgba(255,209,102,0.9)' : 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(gx, gy, 3, 0, Math.PI * 2); ctx.fill();
    }

    // AU legend
    let ly = 16; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const [region, act] of Object.entries(au)) {
      if (act < 0.05) continue;
      const [r, g, b] = REGION_COLORS[region] || [255, 255, 255];
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fillText(`${REGION_LABELS[region]}: ${Math.round(act * 100)}%`, 10, ly);
      ly += 14;
    }
  }
}