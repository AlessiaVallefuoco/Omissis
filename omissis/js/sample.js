/* Omissis: procedural sample scene (fallback when no webcam) and the "forgery" edit. */
(function (root) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function glow(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** Draw a dusk street scene with a car (licence plate) and a pedestrian (face) to redact. */
  function draw(ctx, W, H) {
    const rand = mulberry32(42);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, 470);
    sky.addColorStop(0, '#0e1a3a');
    sky.addColorStop(0.45, '#3a3d78');
    sky.addColorStop(0.75, '#b85d7a');
    sky.addColorStop(1, '#f3a35a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 470);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.5})`;
      ctx.fillRect(rand() * W, rand() * 200, 1.5, 1.5);
    }
    glow(ctx, 720, 430, 170, 'rgba(255,214,150,0.85)');
    ctx.fillStyle = '#ffe6b5';
    ctx.beginPath(); ctx.arc(720, 440, 38, 0, Math.PI * 2); ctx.fill();

    // far skyline
    let x = 0;
    while (x < W) {
      const w = 34 + rand() * 60, h = 70 + rand() * 150;
      ctx.fillStyle = '#2b2550';
      ctx.fillRect(x, 470 - h, w, h);
      for (let wy = 470 - h + 8; wy < 460; wy += 13) {
        for (let wx = x + 5; wx < x + w - 6; wx += 10) {
          if (rand() < 0.22) { ctx.fillStyle = rand() < 0.5 ? '#ffd27a' : '#ffb85c'; ctx.fillRect(wx, wy, 4, 6); }
        }
      }
      x += w + 2;
    }
    // near buildings
    const near = [[0, 150, 330], [150, 70, 260], [800, 160, 360], [905, 55, 300]];
    for (const [bx, bw, bh] of near) {
      ctx.fillStyle = '#17142c';
      ctx.fillRect(bx, 470 - bh, bw, bh);
      for (let wy = 470 - bh + 14; wy < 455; wy += 22) {
        for (let wx = bx + 10; wx < bx + bw - 16; wx += 22) {
          ctx.fillStyle = rand() < 0.35 ? '#ffcf73' : '#241f3f';
          ctx.fillRect(wx, wy, 12, 14);
        }
      }
    }
    // neon sign
    ctx.save();
    ctx.font = '700 30px "Space Grotesk", system-ui, sans-serif';
    ctx.shadowColor = '#ff5fc8'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffb3e6';
    ctx.fillText('CAFÉ', 818, 200);
    ctx.restore();

    // pavement and road
    ctx.fillStyle = '#3b3446';
    ctx.fillRect(0, 462, W, 34);
    ctx.fillStyle = '#5a5168';
    ctx.fillRect(0, 494, W, 5);
    const road = ctx.createLinearGradient(0, 499, 0, H);
    road.addColorStop(0, '#2a2733');
    road.addColorStop(1, '#141319');
    ctx.fillStyle = road;
    ctx.fillRect(0, 499, W, H - 499);
    ctx.fillStyle = '#d9cfa6';
    for (let lx = 10; lx < W; lx += 120) ctx.fillRect(lx, 655, 70, 7);

    // street lamp
    ctx.fillStyle = '#0d0c14';
    ctx.fillRect(116, 230, 8, 240);
    ctx.fillRect(116, 230, 46, 6);
    glow(ctx, 160, 244, 120, 'rgba(255,214,140,0.55)');
    ctx.fillStyle = '#fff1c9';
    roundRect(ctx, 148, 236, 26, 10, 4); ctx.fill();

    // pedestrian (face to redact)
    ctx.fillStyle = '#121019';
    ctx.fillRect(250, 520, 14, 70);
    ctx.fillRect(272, 520, 14, 70);
    ctx.fillStyle = '#3c5a86';
    roundRect(ctx, 240, 420, 56, 112, 16); ctx.fill();
    ctx.fillStyle = '#e2ae8c';
    ctx.beginPath(); ctx.arc(268, 395, 23, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1b12';
    ctx.beginPath(); ctx.arc(268, 386, 24, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1310';
    ctx.fillRect(259, 396, 4, 3); ctx.fillRect(274, 396, 4, 3);

    // car seen from behind (licence plate to redact)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(560, 622, 160, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b0b10';
    roundRect(ctx, 438, 590, 44, 34, 6); ctx.fill();
    roundRect(ctx, 638, 590, 44, 34, 6); ctx.fill();
    ctx.fillStyle = '#b5303b';
    ctx.beginPath();
    ctx.moveTo(462, 418); ctx.lineTo(658, 418); ctx.lineTo(694, 486); ctx.lineTo(426, 486); ctx.closePath(); ctx.fill();
    const body = ctx.createLinearGradient(0, 470, 0, 600);
    body.addColorStop(0, '#d23c47');
    body.addColorStop(1, '#8e1f2a');
    ctx.fillStyle = body;
    roundRect(ctx, 424, 470, 272, 128, 18); ctx.fill();
    const win = ctx.createLinearGradient(0, 428, 0, 478);
    win.addColorStop(0, '#f2a26a');
    win.addColorStop(1, '#3b3d74');
    ctx.fillStyle = win;
    ctx.beginPath();
    ctx.moveTo(474, 428); ctx.lineTo(646, 428); ctx.lineTo(672, 478); ctx.lineTo(448, 478); ctx.closePath(); ctx.fill();
    glow(ctx, 456, 512, 40, 'rgba(255,60,60,0.55)');
    glow(ctx, 664, 512, 40, 'rgba(255,60,60,0.55)');
    ctx.fillStyle = '#ff3d3d';
    roundRect(ctx, 434, 500, 44, 24, 6); ctx.fill();
    roundRect(ctx, 642, 500, 44, 24, 6); ctx.fill();
    ctx.fillStyle = '#1b1b22';
    roundRect(ctx, 420, 574, 280, 26, 10); ctx.fill();
    // plate
    ctx.fillStyle = '#f4f4f0';
    roundRect(ctx, 512, 530, 96, 28, 4); ctx.fill();
    ctx.fillStyle = '#1f47b8';
    ctx.fillRect(512, 530, 12, 28);
    ctx.fillStyle = '#111';
    ctx.font = '700 16px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('TS042XR', 528, 550);

    // vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /** Sensor-like noise so every capture of the sample scene is a different image. */
  function addGrain(rgb, amount) {
    // xorshift32 seeded from the CSPRNG (getRandomValues is capped at 64 KB per call)
    let x = (root.crypto || globalThis.crypto).getRandomValues(new Uint32Array(1))[0] || 0x9e3779b9;
    for (let i = 0; i < rgb.length; i++) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      const v = rgb[i] + ((x >>> 0) / 4294967296 - 0.5) * amount;
      rgb[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }

  /** The forgery: paint a fake smoke plume with a fire glow (operates on packed RGB). */
  function addSmoke(rgb, W, H, cx, cy) {
    const rand = mulberry32(7);
    const blend = (x0, y0, rad, col, alpha) => {
      const xa = Math.max(0, Math.floor(x0 - rad)), xb = Math.min(W - 1, Math.ceil(x0 + rad));
      const ya = Math.max(0, Math.floor(y0 - rad)), yb = Math.min(H - 1, Math.ceil(y0 + rad));
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
          const d = Math.hypot(x - x0, y - y0) / rad;
          if (d >= 1) continue;
          const a = alpha * Math.pow(1 - d, 1.6);
          const o = (y * W + x) * 3;
          rgb[o] += (col[0] - rgb[o]) * a;
          rgb[o + 1] += (col[1] - rgb[o + 1]) * a;
          rgb[o + 2] += (col[2] - rgb[o + 2]) * a;
        }
      }
    };
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const px = cx + (rand() - 0.5) * 80 + t * 90;
      const py = cy - t * 360 + (rand() - 0.5) * 26;
      const rad = 44 + t * 95 + rand() * 26;
      const g = 92 + rand() * 46 + t * 18;
      blend(px, py, rad, [g, g - 4, g - 6], 0.55 + rand() * 0.25);
    }
    blend(cx, cy + 30, 150, [255, 110, 25], 0.6);
    blend(cx, cy + 40, 80, [255, 190, 90], 0.85);
    blend(cx, cy + 46, 34, [255, 240, 200], 0.9);
  }

  root.TesseraSample = { draw, addGrain, addSmoke };
})(typeof window !== 'undefined' ? window : globalThis);
