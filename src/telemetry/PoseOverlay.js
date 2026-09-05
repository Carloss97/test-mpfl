/**
 * PoseOverlay — dibuja la silueta corporal en un canvas.
 * Similar a FaceMeshOverlay pero para los 33 landmarks de MediaPipe Pose.
 */
export default class PoseOverlay {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pose-overlay';
    this.ctx = this.canvas.getContext('2d');
    this.landmarks = null;
    this.visible = true;
    this.rafId = null;
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
  update({ landmarks }) {
    this.landmarks = landmarks;
  }
  _resize() {
    const r = this.container.getBoundingClientRect();
    const w = Math.floor(r.width), h = Math.floor(r.height);
    if (w > 0 && h > 0) { this.canvas.width = w; this.canvas.height = h; }
  }
  _draw() {
    if (!this._mounted) return;
    this._rafId = requestAnimationFrame(this._draw);
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    if (cw <= 0 || ch <= 0) return;
    ctx.fillStyle = '#050d18';
    ctx.fillRect(0, 0, cw, ch);

    const lm = this.landmarks;
    if (!lm || lm.length < 33 * 4) {
      ctx.fillStyle = '#9fb0c2'; ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('Esperando detección corporal...', cw / 2, ch / 2);
      return;
    }
    const points = [];
    for (let i = 0; i < 33; i++) {
      points.push({ x: lm[i * 4] * cw, y: lm[i * 4 + 1] * ch, v: lm[i * 4 + 3] ?? 1 });
    }

    // Connections (MediaPipe Pose topology)
    const connections = [
      [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8], // face + arms
      [9,10],[11,12],[11,13],[13,15],[12,14],[14,16], // shoulders + arms
      [15,17],[16,18],[17,19],[18,20],[15,21],[16,22], // hands
      [11,23],[12,24],[23,25],[24,26],[25,27],[26,28], // torso + legs
      [27,29],[28,30],[29,31],[30,32], // feet
    ];

    ctx.strokeStyle = 'rgba(77,212,172,0.35)'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (const [a, b] of connections) {
      if (a < points.length && b < points.length && points[a].v > 0.5 && points[b].v > 0.5) {
        ctx.moveTo(points[a].x, points[a].y);
        ctx.lineTo(points[b].x, points[b].y);
      }
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(77,212,172,0.5)';
    for (let i = 0; i < points.length; i++) {
      if (points[i].v < 0.5) continue;
      ctx.beginPath(); ctx.arc(points[i].x, points[i].y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Head larger
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      if (i < points.length && points[i].v > 0.5) {
        ctx.fillStyle = 'rgba(116,167,255,0.4)';
        ctx.beginPath(); ctx.arc(points[i].x, points[i].y, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}