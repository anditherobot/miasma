// SmoothFilter applies exponential smoothing to hand landmarks.
export class SmoothFilter {
  constructor(alpha = 0.35) {
    this.alpha = alpha;
    this.prev = null;
  }

  apply(landmarks) {
    if (!landmarks || landmarks.length === 0) return [];
    if (!this.prev) {
      this.prev = landmarks.map((p) => ({ ...p }));
      return this.prev;
    }
    const out = landmarks.map((p, i) => {
      const last = this.prev[i];
      const x = this.alpha * p.x + (1 - this.alpha) * last.x;
      const y = this.alpha * p.y + (1 - this.alpha) * last.y;
      const z = this.alpha * (p.z ?? 0) + (1 - this.alpha) * (last.z ?? 0);
      return { x, y, z };
    });
    this.prev = out;
    return out;
  }
}

// Simple sanity test
export function selfTestSmoothFilter() {
  const f = new SmoothFilter(0.5);
  const seq = [
    [{ x: 0, y: 0, z: 0 }],
    [{ x: 1, y: 0, z: 0 }],
    [{ x: 1, y: 0, z: 0 }]
  ];
  const outs = seq.map((s) => f.apply(s)[0].x);
  return outs[0] === 0 && Math.abs(outs[1] - 0.5) < 1e-6 && Math.abs(outs[2] - 0.75) < 1e-6;
}
