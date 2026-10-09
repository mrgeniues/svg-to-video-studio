/**
 * Overlay Library for Remotion Custom Code Studio
 * 14 reusable, 100% deterministic SVG fragments.
 * Duration-relative animations using frame/totalFrames.
 * Pure seeded randomness with integer cycle counts for loops.
 * Returns inner SVG fragments without root <svg>.
 */

export interface OverlayOptions {
  accent?: string;
  title?: string;
  seed?: string;
  [key: string]: any;
}

export type OverlayFn = (
  frame: number,
  totalFrames: number,
  W: number,
  H: number,
  o?: OverlayOptions
) => string;

// Simple deterministic hash & PRNG for string seeds
export function stringSeedRng(seedStr: string = 'overlay') {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function escapeXmlOverlay(unsafe: string = ''): string {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t);
}

// 1. gridOverlay — animated dot-grid background with subtle drift
export const gridOverlay: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const progress = totalFrames > 0 ? (frame / totalFrames) % 1 : 0;
  const drift = Math.sin(progress * Math.PI * 2) * 6;
  const cols = Math.floor(W / 60);
  const rows = Math.floor(H / 60);

  let dots = '';
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r <= rows; r++) {
      const x = c * 60 + 30 + drift;
      const y = r * 60 + 30;
      const opacity = ((c + r) % 4 === 0 ? 0.35 : 0.15).toFixed(2);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="${accent}" opacity="${opacity}" />`;
    }
  }

  return `<g class="ov-grid">${dots}</g>`;
};

// 2. scanline — horizontal light scan-line sweep
export const scanline: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const progress = totalFrames > 0 ? (frame / totalFrames) % 1 : 0;
  // Exactly 2 full vertical sweeps
  const sweepY = ((progress * 2) % 1) * H;
  return `
    <g class="ov-scanline" pointer-events="none">
      <line x1="0" y1="${sweepY.toFixed(1)}" x2="${W}" y2="${sweepY.toFixed(1)}" stroke="${accent}" stroke-width="2" opacity="0.65" />
      <rect x="0" y="${Math.max(0, sweepY - 30).toFixed(1)}" width="${W}" height="30" fill="${accent}" opacity="0.08" />
    </g>
  `;
};

// 3. hudRing — rotating tick ring + progress arc + center readout
export const hudRing: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const p = totalFrames > 0 ? clamp(frame / totalFrames, 0, 1) : 0;
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) * 0.18;
  const circum = 2 * Math.PI * r;
  const arcDash = (circum * easeOut(p)).toFixed(1);
  const rotation = (p * 360 * 2) % 360; // 2 integer full rotations
  const pctText = Math.round(p * 100);

  let ticks = '';
  for (let i = 0; i < 36; i++) {
    const angle = (i * 10 * Math.PI) / 180;
    const x1 = cx + (r + 8) * Math.cos(angle);
    const y1 = cy + (r + 8) * Math.sin(angle);
    const x2 = cx + (r + (i % 3 === 0 ? 18 : 12)) * Math.cos(angle);
    const y2 = cy + (r + (i % 3 === 0 ? 18 : 12)) * Math.sin(angle);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${accent}" stroke-width="1.5" opacity="${i % 3 === 0 ? '0.7' : '0.3'}" />`;
  }

  return `
    <g class="ov-hudring">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#334155" stroke-width="6" opacity="0.4" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="6" stroke-dasharray="${circum.toFixed(1)}" stroke-dashoffset="${(circum - parseFloat(arcDash)).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
      <g transform="rotate(${rotation.toFixed(1)} ${cx} ${cy})">${ticks}</g>
      <text x="${cx}" y="${cy + 8}" fill="#ffffff" font-size="${(r * 0.35).toFixed(0)}" font-weight="900" font-family="monospace" text-anchor="middle">${pctText}%</text>
      <text x="${cx}" y="${cy + r * 0.45}" fill="${accent}" font-size="11" font-weight="700" letter-spacing="2" text-anchor="middle">SYSTEM STATUS</text>
    </g>
  `;
};

// 4. dataTicker — bottom scrolling values ticker
export const dataTicker: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const progress = totalFrames > 0 ? (frame / totalFrames) % 1 : 0;
  const barY = H - 44;
  const items = [
    'BTC +4.82%', 'ETH +3.14%', 'VOL $1.2B', 'S&P 500 +0.65%',
    'TPS 42,910', 'LATENCY 12ms', 'NODES 1,024', 'BLOCK 18,920,411'
  ];
  const combined = items.join('   •   ') + '   •   ' + items.join('   •   ');
  const shiftX = -(progress * 600) % 600;

  return `
    <g class="ov-dataticker" transform="translate(0, ${barY})">
      <rect x="0" y="0" width="${W}" height="44" fill="#090d16" stroke="#1e293b" stroke-width="1" />
      <g clip-path="url(#ov-ticker-clip)">
        <defs>
          <clipPath id="ov-ticker-clip"><rect x="0" y="0" width="${W}" height="44" /></clipPath>
        </defs>
        <text x="${shiftX.toFixed(1)}" y="27" fill="${accent}" font-size="13" font-family="monospace" font-weight="700" letter-spacing="1.5">
          ${escapeXmlOverlay(combined)}
        </text>
      </g>
    </g>
  `;
};

// 5. lowerThird — slide-in title card with accent bar
export const lowerThird: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const title = o.title || 'BROADCAST LOWER THIRD';
  const p = totalFrames > 0 ? clamp(frame / totalFrames, 0, 1) : 0;
  // Slide in during first 15%, hold, slide out during last 15%
  let slide = 1;
  if (p < 0.15) {
    slide = easeOut(p / 0.15);
  } else if (p > 0.85) {
    slide = easeOut((1 - p) / 0.15);
  }
  const cardW = Math.min(520, W * 0.45);
  const cardH = 76;
  const posX = -cardW * (1 - slide) + 40;
  const posY = H - cardH - 60;

  return `
    <g class="ov-lowerthird" transform="translate(${posX.toFixed(1)}, ${posY})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="8" fill="#0b1120" stroke="#1e293b" stroke-width="1.5" />
      <rect x="0" y="0" width="8" height="${cardH}" rx="4" fill="${accent}" />
      <text x="24" y="32" fill="#ffffff" font-size="17" font-weight="800" letter-spacing="1">${escapeXmlOverlay(title)}</text>
      <text x="24" y="55" fill="${accent}" font-size="11" font-weight="700" letter-spacing="2">LIVE ON-AIR TRANSMISSION</text>
    </g>
  `;
};

// 6. counter — big count-up number with label
export const counter: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const p = totalFrames > 0 ? clamp(frame / totalFrames, 0, 1) : 0;
  const countP = easeOut(p);
  const targetVal = 1845000;
  const currentVal = Math.round(targetVal * countP).toLocaleString('en-US');
  const cx = W / 2;
  const cy = H * 0.35;

  return `
    <g class="ov-counter" transform="translate(${cx}, ${cy})">
      <rect x="-240" y="-70" width="480" height="130" rx="12" fill="#0b1120" stroke="#1e293b" stroke-width="1.5" />
      <text x="0" y="-35" fill="#94a3b8" font-size="11" font-weight="800" letter-spacing="2" text-anchor="middle">AGGREGATE SYSTEM VOLUME</text>
      <text x="0" y="24" fill="${accent}" font-size="44" font-family="monospace" font-weight="900" text-anchor="middle">${currentVal}</text>
      <text x="0" y="48" fill="#10b981" font-size="11" font-weight="700" text-anchor="middle">▲ +14.2% THIS CYCLE</text>
    </g>
  `;
};

// 7. barChart — animated bars with value labels (seeded data)
export const barChart: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const rng = stringSeedRng(o.seed || 'barChart');
  const p = totalFrames > 0 ? clamp(frame / totalFrames, 0, 1) : 0;
  const barCount = 7;
  const barW = 34;
  const gap = 20;
  const totalW = barCount * barW + (barCount - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = H * 0.72;
  const maxH = 140;

  let bars = '';
  for (let i = 0; i < barCount; i++) {
    const rawTarget = 30 + rng() * 70;
    const staggerP = clamp((p - i * 0.08) / 0.45, 0, 1);
    const curH = (rawTarget / 100) * maxH * easeOut(staggerP);
    const x = startX + i * (barW + gap);
    const y = startY - curH;
    const val = Math.round(rawTarget * staggerP);
    bars += `
      <g>
        <rect x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${curH.toFixed(1)}" rx="4" fill="${accent}" opacity="${0.6 + (i % 2) * 0.35}" />
        <text x="${x + barW / 2}" y="${(y - 8).toFixed(1)}" fill="#cbd5e1" font-size="10" font-family="monospace" font-weight="700" text-anchor="middle">${val}</text>
        <text x="${x + barW / 2}" y="${(startY + 18).toFixed(1)}" fill="#64748b" font-size="10" font-weight="600" text-anchor="middle">C${i + 1}</text>
      </g>
    `;
  }

  return `
    <g class="ov-barchart">
      <line x1="${startX - 20}" y1="${startY}" x2="${startX + totalW + 20}" y2="${startY}" stroke="#334155" stroke-width="1.5" />
      ${bars}
    </g>
  `;
};

// 8. lineChart — drawing line + gradient area + glowing end dot
export const lineChart: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const rng = stringSeedRng(o.seed || 'lineChart');
  const p = totalFrames > 0 ? clamp(frame / totalFrames, 0, 1) : 0;
  const drawP = easeOut(p);

  const chartW = Math.min(600, W * 0.65);
  const chartH = 160;
  const startX = (W - chartW) / 2;
  const startY = H * 0.55;

  const pts: [number, number][] = [];
  const ptCount = 9;
  for (let i = 0; i < ptCount; i++) {
    const px = startX + (i / (ptCount - 1)) * chartW;
    const py = startY + chartH - (20 + rng() * (chartH - 40));
    pts.push([px, py]);
  }

  const visibleCount = Math.max(2, Math.floor(drawP * ptCount) + 1);
  const visiblePts = pts.slice(0, visibleCount);

  let pathD = `M ${visiblePts[0][0]} ${visiblePts[0][1]}`;
  for (let i = 1; i < visiblePts.length; i++) {
    pathD += ` L ${visiblePts[i][0]} ${visiblePts[i][1]}`;
  }

  const lastPt = visiblePts[visiblePts.length - 1];

  return `
    <g class="ov-linechart">
      <path d="${pathD}" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="6" fill="${accent}" />
      <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="12" fill="${accent}" opacity="0.3" />
    </g>
  `;
};

// 9. donutChart — animated donut segments (seeded)
export const donutChart: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const p = totalFrames > 0 ? clamp(frame / totalFrames, 0, 1) : 0;
  const cx = W * 0.75;
  const cy = H * 0.45;
  const r = 60;
  const circum = 2 * Math.PI * r;
  const seg1Pct = 0.55 * easeOut(p);
  const seg2Pct = 0.30 * easeOut(p);

  const dash1 = (circum * seg1Pct).toFixed(1);
  const dash2 = (circum * seg2Pct).toFixed(1);

  return `
    <g class="ov-donutchart" transform="translate(0, 0)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1e293b" stroke-width="14" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="14" stroke-dasharray="${dash1} ${circum}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#10b981" stroke-width="14" stroke-dasharray="${dash2} ${circum}" stroke-dashoffset="-${dash1}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
      <text x="${cx}" y="${cy + 6}" fill="#ffffff" font-size="16" font-family="monospace" font-weight="800" text-anchor="middle">${Math.round(p * 85)}%</text>
    </g>
  `;
};

// 10. radarSweep — rotating radar sweep with blips (seeded)
export const radarSweep: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const rng = stringSeedRng(o.seed || 'radarSweep');
  const p = totalFrames > 0 ? (frame / totalFrames) % 1 : 0;
  const cx = W * 0.25;
  const cy = H * 0.45;
  const r = 80;
  const angle = (p * 360 * 3) % 360; // 3 full rotations

  let blips = '';
  for (let i = 0; i < 4; i++) {
    const bx = cx + (rng() - 0.5) * (r * 1.4);
    const by = cy + (rng() - 0.5) * (r * 1.4);
    const pulse = (Math.sin((p * 6 + i) * Math.PI) + 1) / 2;
    blips += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="3" fill="#10b981" opacity="${(0.3 + 0.7 * pulse).toFixed(2)}" />`;
  }

  const rad = (angle * Math.PI) / 180;
  const lx = cx + r * Math.cos(rad);
  const ly = cy + r * Math.sin(rad);

  return `
    <g class="ov-radarsweep">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b1120" stroke="#1e293b" stroke-width="1.5" />
      <circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="3 3" />
      <circle cx="${cx}" cy="${cy}" r="${r * 0.33}" fill="none" stroke="#1e293b" stroke-width="1" />
      <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#1e293b" stroke-width="1" />
      <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#1e293b" stroke-width="1" />
      ${blips}
      <line x1="${cx}" y1="${cy}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${accent}" stroke-width="2" />
    </g>
  `;
};

// 11. networkNodes — seeded connected node network, gently pulsing
export const networkNodes: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const rng = stringSeedRng(o.seed || 'networkNodes');
  const p = totalFrames > 0 ? (frame / totalFrames) % 1 : 0;
  const cx = W / 2;
  const cy = H * 0.65;

  const nodeCount = 6;
  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const nx = cx + (rng() - 0.5) * 360;
    const ny = cy + (rng() - 0.5) * 160;
    nodes.push({ x: nx, y: ny });
  }

  let lines = '';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      lines += `<line x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${nodes[j].x.toFixed(1)}" y2="${nodes[j].y.toFixed(1)}" stroke="#1e293b" stroke-width="1" />`;
    }
  }

  let circles = '';
  nodes.forEach((n, idx) => {
    const pulse = (Math.sin((p * 4 + idx) * Math.PI) + 1) / 2;
    circles += `
      <circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(4 + pulse * 2).toFixed(1)}" fill="${accent}" opacity="0.8" />
    `;
  });

  return `<g class="ov-networknodes">${lines}${circles}</g>`;
};

// 12. particles — floating particle field (seeded)
export const particles: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const rng = stringSeedRng(o.seed || 'particles');
  const p = totalFrames > 0 ? (frame / totalFrames) % 1 : 0;

  const count = 28;
  let dots = '';
  for (let i = 0; i < count; i++) {
    const initX = rng() * W;
    const initY = rng() * H;
    const speed = 0.5 + rng() * 1.5;
    const yShift = (p * speed * 80) % H;
    const curY = (initY - yShift + H) % H;
    const curX = initX + Math.sin((p * 2 + i) * Math.PI * 2) * 12;
    const op = (0.2 + rng() * 0.5).toFixed(2);
    dots += `<circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="${(1 + rng() * 2).toFixed(1)}" fill="${accent}" opacity="${op}" />`;
  }

  return `<g class="ov-particles" pointer-events="none">${dots}</g>`;
};

// 13. waveform — animated audio-style waveform bars
export const waveform: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const rng = stringSeedRng(o.seed || 'waveform');
  const p = totalFrames > 0 ? (frame / totalFrames) % 1 : 0;

  const barCount = 32;
  const barW = 4;
  const gap = 4;
  const totalW = barCount * (barW + gap);
  const startX = (W - totalW) / 2;
  const cy = H * 0.88;

  let bars = '';
  for (let i = 0; i < barCount; i++) {
    const phase = rng() * Math.PI * 2;
    const h = 8 + Math.abs(Math.sin(p * Math.PI * 8 + phase)) * 34;
    const x = startX + i * (barW + gap);
    bars += `<rect x="${x}" y="${(cy - h / 2).toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="2" fill="${accent}" opacity="0.75" />`;
  }

  return `<g class="ov-waveform">${bars}</g>`;
};

// 14. kineticTitle — staggered word/letter reveal title
export const kineticTitle: OverlayFn = (frame, totalFrames, W, H, o = {}) => {
  const accent = o.accent || '#38bdf8';
  const text = o.title || 'KINETIC MOTION GRAPHIC';
  const p = totalFrames > 0 ? clamp(frame / totalFrames, 0, 1) : 0;
  const words = text.split(' ');
  const cx = W / 2;
  const cy = H * 0.16;

  let tspans = '';
  words.forEach((w, idx) => {
    const wordP = clamp((p - idx * 0.1) / 0.25, 0, 1);
    const slideY = (1 - easeOut(wordP)) * 24;
    const op = easeOut(wordP).toFixed(2);
    tspans += `
      <tspan dx="${idx > 0 ? 18 : 0}" dy="${idx === 0 ? slideY.toFixed(1) : '0'}" fill="${idx % 2 === 1 ? accent : '#ffffff'}" opacity="${op}">
        ${escapeXmlOverlay(w)}
      </tspan>
    `;
  });

  return `
    <g class="ov-kinetictitle">
      <text x="${cx}" y="${cy}" font-size="32" font-weight="900" letter-spacing="2" text-anchor="middle">
        ${tspans}
      </text>
    </g>
  `;
};

// Registry of all 14 overlays
export const OVERLAYS: Record<string, OverlayFn> = {
  gridOverlay,
  scanline,
  hudRing,
  dataTicker,
  lowerThird,
  counter,
  barChart,
  lineChart,
  donutChart,
  radarSweep,
  networkNodes,
  particles,
  waveform,
  kineticTitle
};
