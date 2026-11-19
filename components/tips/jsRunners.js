// The canvas animations. Same logic as the code shown on the page. Each runner is given the canvas size and
// returns frame(t, k): t = seconds, k = how many 60fps frames have passed (so speed is the same on 120Hz phones).
export const RUNNERS = {
  balls(ctx, W, H) {
    const colors = ['#f2c94c', '#ff7a59', '#5ac8fa'];
    const gap = W / 8;
    const balls = Array.from({ length: 7 }, (_, i) => ({ x: gap * (i + 1), y: 30 + i * 12, vy: 0, r: 12 + (i % 3) * 4, color: colors[i % 3] }));
    return (t, k) => {
      ctx.clearRect(0, 0, W, H);
      for (const b of balls) {
        b.vy += 0.35 * k; b.y += b.vy * k;
        if (b.y + b.r > H) { b.y = H - b.r; b.vy *= -0.85; if (Math.abs(b.vy) < 1) b.vy = -12; }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = b.color; ctx.fill();
      }
    };
  },
  waves(ctx, W, H) {
    const colors = ['#f2c94c', '#ff7a59', '#5ac8fa'];
    return (t) => {
      ctx.clearRect(0, 0, W, H);
      colors.forEach((color, i) => {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const y = H / 2 + Math.sin(x * 0.02 + t * (1 + i * 0.5)) * (30 + i * 12);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
      });
    };
  },
  stars(ctx, W, H) {
    const stars = Array.from({ length: 140 }, () => ({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W }));
    return (t, k) => {
      ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f2c94c';
      for (const s of stars) {
        s.z -= 4 * k; if (s.z < 1) s.z = W;
        const px = W / 2 + (s.x / s.z) * 120, py = H / 2 + (s.y / s.z) * 120, size = (1 - s.z / W) * 3;
        ctx.fillRect(px, py, size, size);
      }
    };
  },
  sparks(ctx, W, H) {
    const parts = [];
    return (t, k) => {
      ctx.fillStyle = 'rgba(11, 12, 16, 0.25)'; ctx.fillRect(0, 0, W, H);
      if (parts.length < 150) for (let i = 0; i < 3; i++) parts.push({ x: W / 2, y: H - 20, vx: (Math.random() - 0.5) * 4, vy: -(Math.random() * 6 + 4), life: 1 });
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += 0.12 * k; p.x += p.vx * k; p.y += p.vy * k; p.life -= 0.012 * k;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = '#f2c94c'; ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;
    };
  },
  orbits(ctx, W, H) {
    const planets = [{ r: 38, size: 5, speed: 2.2, color: '#5ac8fa' }, { r: 66, size: 7, speed: 1.4, color: '#ff7a59' }, { r: 98, size: 9, speed: 0.8, color: '#a78bfa' }];
    const scale = Math.min(1, H / 230);
    return (t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 14 * scale, 0, Math.PI * 2); ctx.fillStyle = '#f2c94c'; ctx.fill();
      for (const p of planets) {
        const x = W / 2 + Math.cos(t * p.speed) * p.r * scale, y = H / 2 + Math.sin(t * p.speed) * p.r * scale;
        ctx.beginPath(); ctx.arc(x, y, p.size * scale, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      }
    };
  }
};
