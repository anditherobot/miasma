// CursorOverlay renders reticle and hand skeleton on a full-screen canvas.
export class CursorOverlay {
  constructor({ mirror = false } = {}) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1000';
    document.body.appendChild(this.canvas);
    window.addEventListener('resize', () => this.resize());
    this.pops = []; // small visual pops on tap
    this.mirror = mirror;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  popAt(normalized) {
    if (!normalized) return;
    this.pops.push({ ...normalized, t: 0 });
  }

  draw({ hands = [], anchors = [] }) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    hands.forEach((hand, idx) => {
      if (hand) this.drawSkeleton(hand, idx);
      if (anchors[idx]) this.drawReticle(anchors[idx]);
    });
    this.drawPops();
  }

  drawSkeleton(hand, idx = 0) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(0,255,170,0.6)';
    ctx.lineWidth = 2;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tx = (v) => (this.mirror ? 1 - v : v);

    const bones = [
      [0,1],[1,2],[2,3],[3,4], // thumb
      [0,5],[5,6],[6,7],[7,8], // index
      [5,9],[9,10],[10,11],[11,12], // middle
      [9,13],[13,14],[14,15],[15,16], // ring
      [13,17],[17,18],[18,19],[19,20], // pinky
      [0,17]
    ];

    bones.forEach(([a,b]) => {
      const p1 = hand[a];
      const p2 = hand[b];
      ctx.beginPath();
      ctx.moveTo(tx(p1.x) * w, p1.y * h);
      ctx.lineTo(tx(p2.x) * w, p2.y * h);
      ctx.stroke();
    });

    hand.forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = '#00ffaa';
      ctx.arc(tx(p.x) * w, p.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Label near wrist
    const wrist = hand[0];
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`Hand ${idx}`, tx(wrist.x) * w + 8, wrist.y * h - 8);
  }

  drawReticle(anchor) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tx = (v) => (this.mirror ? 1 - v : v);
    const x = tx(anchor.x) * w;
    const y = anchor.y * h;
    ctx.beginPath();
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 2;
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
  }

  drawPops() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tx = (v) => (this.mirror ? 1 - v : v);
    const next = [];
    this.pops.forEach((p) => {
      const life = p.t / 400; // 400ms fade
      if (life < 1) {
        const r = 8 + life * 14;
        const alpha = 1 - life;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.arc(tx(p.x) * w, p.y * h, r, 0, Math.PI * 2);
        ctx.stroke();
        next.push({ ...p, t: p.t + 16 });
      }
    });
    this.pops = next;
  }
}
