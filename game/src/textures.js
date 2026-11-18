// Canvas-painted textures, generated at boot: building facades with lit and
// dark windows, shop awnings and signs, the asphalt road with lane dashes,
// sand and the boardwalk. Nothing is loaded from a file.
function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const FACADE_BASE = ['#c98f5f', '#b7a284', '#8fa3b5', '#a5716d', '#7d8f7a', '#c2b49a', '#96705f', '#6f7f95'];
const FACADE_TRIM = ['#efe6d4', '#d8cbb2', '#f2ede2', '#e3d3b8'];

export function makeFacadeTextures(rng) {
  const out = [];
  for (let i = 0; i < 8; i += 1) {
    const base = FACADE_BASE[i % FACADE_BASE.length];
    const trim = FACADE_TRIM[i % FACADE_TRIM.length];
    const litRatio = 0.25 + rng.next() * 0.35;
    out.push(
      canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        // Floor bands.
        const floors = 6;
        const floorH = h / floors;
        for (let f = 0; f < floors; f += 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(0, f * floorH, w, 3);
          // Windows in a row.
          const cols = 5;
          const winW = (w / cols) * 0.52;
          const winH = floorH * 0.52;
          for (let c = 0; c < cols; c += 1) {
            const x = c * (w / cols) + (w / cols - winW) / 2;
            const y = f * floorH + (floorH - winH) / 2;
            const lit = rng.next() < litRatio;
            ctx.fillStyle = lit ? '#ffd98a' : '#22384e';
            ctx.fillRect(x, y, winW, winH);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(x, y, winW, 3);
          }
        }
        // Ground floor: a shopfront band with an awning.
        ctx.fillStyle = trim;
        ctx.fillRect(0, h - 34, w, 34);
        ctx.fillStyle = i % 2 === 0 ? '#b23a2e' : '#2e6b4f';
        ctx.fillRect(0, h - 44, w, 12);
        for (let a = 0; a < 8; a += 1) {
          ctx.fillStyle = a % 2 === 0 ? '#f2e3c2' : '#b23a2e';
          ctx.fillRect(a * 32, h - 44, 32, 12);
        }
      }),
    );
  }
  return out;
}

export function makeRoadTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(0, 0, w, h);
    // Subtle asphalt speckle.
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // Centre dashes, running along the tile's vertical axis.
    ctx.fillStyle = '#e8d44d';
    for (let y = 0; y < h; y += 64) ctx.fillRect(w / 2 - 4, y + 8, 8, 34);
    // Edge lines.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(6, 0, 4, h);
    ctx.fillRect(w - 10, 0, 4, h);
  });
}

export function makeSandTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8cf9a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i += 1) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(190,150,90,0.25)' : 'rgba(255,240,200,0.25)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

export function makeSignTexture(text, bg, fg) {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
}

export function makeBoardwalkTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9a7a52';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, y + 3, w, 2);
    }
  });
}
