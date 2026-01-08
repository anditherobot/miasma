import { distance2D } from './spatial_math.js';

// Tracks per-hand motion over time.
export class MotionTracker {
  constructor() {
    this.last = new Map();
  }

  // landmarks: array of hands; returns metrics map by hand index
  update(landmarks) {
    const now = performance.now();
    const metrics = new Map();
    (landmarks || []).forEach((hand, idx) => {
      const wrist = hand[0];
      const prev = this.last.get(idx);
      if (prev) {
        const dt = (now - prev.time) || 16;
        const vx = (wrist.x - prev.wrist.x) / dt;
        const vy = (wrist.y - prev.wrist.y) / dt;
        metrics.set(idx, { vx, vy, dt });
      } else {
        metrics.set(idx, { vx: 0, vy: 0, dt: 0 });
      }
      this.last.set(idx, { wrist: { ...wrist }, time: now });
    });
    return metrics;
  }
}

// Expansion rate between two hands (distance delta per ms)
export function expansionRate(handA, handB, prevDist, dtMs) {
  if (!handA || !handB || dtMs <= 0) return { rate: 0, dist: prevDist };
  const pA = handA[0];
  const pB = handB[0];
  const dist = distance2D(pA, pB);
  const rate = prevDist !== null ? (dist - prevDist) / dtMs : 0;
  return { rate, dist };
}

// Simple test
export function selfTestMotionTracker() {
  const mt = new MotionTracker();
  mt.update([[{ x: 0, y: 0 }]]);
  const before = performance.now();
  while (performance.now() - before < 20) {
    // wait ~20ms
  }
  const res = mt.update([[{ x: 0, y: -0.2 }]]);
  const { vy } = res.get(0);
  return vy < 0; // moving up should be negative
}
