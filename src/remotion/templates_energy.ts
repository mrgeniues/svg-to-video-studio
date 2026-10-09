import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 9. Energy / Power Grid Dashboard
// ---------------------------------------------------------------------------
export const templateEnergyGrid: RemotionTemplate = {
  id: 'energy-grid',
  name: 'Energy / Power Grid',
  tagline: 'High-voltage grid control room with renewable mix & current flow',
  defaultTitle: 'REGIONAL TRANSMISSION OPERATOR',
  defaultAccent: '#ffe14d',
  presetAccents: ['#ffe14d', '#10b981', '#06b6d4', '#f97316', '#a855f7'],
  scenes: [
    'Power grid network map with current-flow pulses along transmission lines',
    'Energy mix donut (solar/wind/hydro/fossil) with live % counters',
    'Consumption vs Production dual line chart drawing in real time',
    'Battery storage charge rings filling to current capacity',
    'Solar output gauge with sweeping generation needle',
    'CO2 avoidance counter ticking up in metric tons',
    'Substation load bars flashing at peak capacity limits',
    'Peak-demand alert banner cycling seamlessly across duration'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'REGIONAL TRANSMISSION OPERATOR');
    const accent = opts.accent || '#ffe14d';
    const green = '#10b981';
    const cyan = '#06b6d4';
    const bg = '#0a0d12';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Power pulses along high-voltage transmission lines
    const flowPulse = (p * 6) % 1;

    // Grid output count-up: 42,400 -> 48,920 MW
    const gridMW = Math.round(42400 + (48920 - 42400) * easeOutQuad(p)).toLocaleString('en-US');

    // Battery storage charge % (74% -> 88%)
    const battPct = Math.round(74 + 14 * easeOutQuad(p));
    const battCirc = 2 * Math.PI * 45;
    const battDash = (battCirc * (battPct / 100)).toFixed(1);

    // Energy mix (Renewable 64%)
    const renewPct = (64.2 * easeOutQuad(clamp(p / 0.8, 0, 1))).toFixed(1);

    // Dual line chart: Production vs Consumption
    const chartLenEst = 1000;
    const dashOffset = chartLenEst * (1 - easeOutQuad(p));

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-energy" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Header -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#111823" stroke="#1d283a" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-energy)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">GRID SYNCHRONIZATION 60.02 HZ</text>
    <text x="350" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Left: Hero Generation Card -->
    <rect x="40" y="110" width="560" height="130" rx="10" fill="#111823" stroke="#1d283a" stroke-width="1.5" />
    <text x="64" y="140" fill="#94a3b8" font-size="11" font-weight="700">AGGREGATE GRID GENERATION</text>
    <text x="64" y="185" fill="#ffffff" font-size="40" font-weight="900" font-family="monospace">${gridMW} MW</text>
    <rect x="440" y="135" width="140" height="30" rx="6" fill="${green}" fill-opacity="0.15" />
    <text x="510" y="155" fill="${green}" font-size="12" font-weight="800" text-anchor="middle">STABLE RESERVE</text>
    <text x="64" y="215" fill="#64748b" font-size="11">BASELOAD CAPACITY: 52,000 MW • PEAK TIME 15:45</text>

    <!-- Top 3 Mix Cards -->
    ${[
      { label: 'SOLAR ARRAYS', val: '14,200 MW', sub: 'PEAK IRRADIANCE', col: accent },
      { label: 'WIND TURBINES', val: '18,450 MW', sub: 'OFFSHORE CORRIDORS', col: cyan },
      { label: 'HYDRO &amp; PUMPED', val: '6,800 MW', sub: 'DISPATCHABLE', col: green }
    ].map((card, idx) => {
      const cxPos = 620 + idx * 426;
      return `
        <g transform="translate(${cxPos}, 110)">
          <rect x="0" y="0" width="406" height="130" rx="10" fill="#111823" stroke="#1d283a" stroke-width="1.5" />
          <text x="24" y="36" fill="#94a3b8" font-size="11" font-weight="700">${card.label}</text>
          <text x="24" y="80" fill="#ffffff" font-size="30" font-weight="900" font-family="monospace">${card.val}</text>
          <text x="24" y="106" fill="${card.col}" font-size="11" font-weight="700">${card.sub}</text>
        </g>
      `;
    }).join('')}

    <!-- Center Left: Power Grid Transmission Diagram -->
    <rect x="40" y="260" width="1080" height="400" rx="10" fill="#111823" stroke="#1d283a" stroke-width="1.5" />
    <text x="64" y="294" fill="#ffffff" font-size="15" font-weight="800">500KV HIGH-VOLTAGE TRANSMISSION BACKBONE</text>
    <text x="64" y="312" fill="#64748b" font-size="11">Real-time substation bus voltages &amp; phase angles</text>

    <g transform="translate(64, 340)">
      <!-- Transmission lines -->
      <line x1="80" y1="140" x2="360" y2="60" stroke="#1d283a" stroke-width="3" />
      <line x1="360" y1="60" x2="680" y2="60" stroke="#1d283a" stroke-width="3" />
      <line x1="680" y1="60" x2="940" y2="160" stroke="#1d283a" stroke-width="3" />
      <line x1="80" y1="140" x2="500" y2="240" stroke="#1d283a" stroke-width="3" />
      <line x1="500" y1="240" x2="940" y2="160" stroke="#1d283a" stroke-width="3" />

      <!-- Current pulses -->
      <circle cx="${(80 + (360 - 80) * flowPulse).toFixed(1)}" cy="${(140 + (60 - 140) * flowPulse).toFixed(1)}" r="5" fill="${accent}" filter="url(#glow-energy)" />
      <circle cx="${(360 + (680 - 360) * flowPulse).toFixed(1)}" cy="60" r="5" fill="${accent}" filter="url(#glow-energy)" />
      <circle cx="${(680 + (940 - 680) * flowPulse).toFixed(1)}" cy="${(60 + (160 - 60) * flowPulse).toFixed(1)}" r="5" fill="${accent}" filter="url(#glow-energy)" />

      <!-- Substations -->
      ${[
        { x: 80, y: 140, name: 'SUB-A (DESERT SOLAR)' },
        { x: 360, y: 60, name: 'SUB-B (RIVER HYDRO)' },
        { x: 680, y: 60, name: 'SUB-C (NORTH WIND)' },
        { x: 500, y: 240, name: 'SUB-D (BATT STORAGE)' },
        { x: 940, y: 160, name: 'SUB-E (METRO LOAD)' }
      ].map(node => `
        <circle cx="${node.x}" cy="${node.y}" r="16" fill="#1b283a" stroke="${accent}" stroke-width="2" />
        <circle cx="${node.x}" cy="${node.y}" r="6" fill="${accent}" />
        <text x="${node.x}" y="${node.y + 32}" fill="#cbd5e1" font-size="10" font-weight="700" text-anchor="middle">${node.name}</text>
      `).join('')}
    </g>

    <!-- Center Right: Production vs Consumption Dual Chart -->
    <rect x="1140" y="260" width="740" height="400" rx="10" fill="#111823" stroke="#1d283a" stroke-width="1.5" />
    <text x="1164" y="294" fill="#ffffff" font-size="15" font-weight="800">GENERATION VS CONSUMPTION (MW)</text>

    <g transform="translate(1164, 340)">
      <!-- Line 1: Production (Yellow) -->
      <path d="M 0 200 Q 200 160 400 90 T 680 40" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="${chartLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" filter="url(#glow-energy)" />
      <!-- Line 2: Consumption (Cyan) -->
      <path d="M 0 220 Q 250 180 450 120 T 680 80" fill="none" stroke="${cyan}" stroke-width="2.5" stroke-dasharray="${chartLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" />
      <text x="0" y="24" fill="${accent}" font-size="11" font-weight="700">PRODUCTION: 48.9 GW</text>
      <text x="240" y="24" fill="${cyan}" font-size="11" font-weight="700">CONSUMPTION: 44.2 GW</text>
    </g>

    <!-- Bottom Left: Battery Storage Rings -->
    <rect x="40" y="680" width="700" height="360" rx="10" fill="#111823" stroke="#1d283a" stroke-width="1.5" />
    <text x="64" y="714" fill="#ffffff" font-size="14" font-weight="800">UTILITY-SCALE BESS STORAGE</text>

    <g transform="translate(200, 850)">
      <circle cx="0" cy="0" r="45" fill="none" stroke="#1d283a" stroke-width="14" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="${green}" stroke-width="14" stroke-dasharray="${battCirc.toFixed(1)}" stroke-dashoffset="${(battCirc - parseFloat(battDash)).toFixed(1)}" transform="rotate(-90)" />
      <text x="0" y="6" fill="#ffffff" font-size="18" font-weight="900" font-family="monospace" text-anchor="middle">${battPct}%</text>
      <text x="0" y="68" fill="#cbd5e1" font-size="11" font-weight="700" text-anchor="middle">RESERVE CHARGED</text>
    </g>

    <g transform="translate(380, 780)">
      <text x="0" y="24" fill="#94a3b8" font-size="12">CAPACITY: 4,200 MWh</text>
      <text x="0" y="52" fill="#10b981" font-size="12" font-weight="700">DISCHARGE READY: 4.8 HRS</text>
      <text x="0" y="80" fill="#94a3b8" font-size="12">TEMPERATURE: 22.4°C STABLE</text>
    </g>

    <!-- Bottom Right: Renewable Energy Mix Donut -->
    <rect x="760" y="680" width="1120" height="360" rx="10" fill="#111823" stroke="#1d283a" stroke-width="1.5" />
    <text x="784" y="714" fill="#ffffff" font-size="14" font-weight="800">CLEAN ENERGY PENETRATION INDEX</text>

    <g transform="translate(1320, 850)">
      <circle cx="0" cy="0" r="55" fill="none" stroke="#1d283a" stroke-width="16" />
      <circle cx="0" cy="0" r="55" fill="none" stroke="${accent}" stroke-width="16" stroke-dasharray="345" stroke-dashoffset="${(345 * (1 - parseFloat(renewPct) / 100)).toFixed(1)}" transform="rotate(-90)" />
      <text x="0" y="8" fill="#ffffff" font-size="22" font-weight="900" font-family="monospace" text-anchor="middle">${renewPct}%</text>
      <text x="0" y="78" fill="#cbd5e1" font-size="12" font-weight="700" text-anchor="middle">CARBON-FREE ELECTRICITY</text>
    </g>
  </g>
</svg>`;
  }
};
