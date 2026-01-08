export function distance2D(a, b) {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function centroid(points) {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function toViewport(point, width, height) {
  return { x: point.x * width, y: point.y * height };
}

// Simple test
export function selfTestSpatialMath() {
  const m = midpoint({ x: 0, y: 0 }, { x: 10, y: 10 });
  const c = centroid([{ x: 0, y: 0 }, { x: 2, y: 2 }]);
  return m.x === 5 && m.y === 5 && c.x === 1 && c.y === 1;
}
