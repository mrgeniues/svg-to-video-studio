/**
 * Remotion Templates for SVG to Video Studio
 * Pure deterministic frame rendering functions returning complete standalone SVG strings.
 * Uses mulberry32 PRNG for seeded variation.
 * NO Math.random(), NO Date.now(), NO <animate>/SMIL, NO CSS keyframe animations.
 */

// XML escaping helper
export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
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

// Deterministic PRNG: mulberry32
export function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TemplateRenderOpts {
  title: string;
  accent: string;
}

export interface RemotionTemplate {
  id: string;
  name: string;
  tagline: string;
  defaultTitle: string;
  scenes: string[];
  defaultAccent: string;
  presetAccents: string[];
  renderFrame: (
    t: number,
    duration: number,
    W: number,
    H: number,
    opts: TemplateRenderOpts
  ) => string;
}

// Easing helper
function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ============================================================================
// TEMPLATE 1: Business Analytics Dashboard
// ============================================================================
const templateBusinessAnalytics: RemotionTemplate = {
  id: 'business-analytics',
  name: 'Business Analytics Dashboard',
  tagline: 'Dark navy enterprise command center with live metrics and charts',
  defaultTitle: 'GLOBAL ENTERPRISE INTELLIGENCE',
  scenes: [
    'Header command bar with live pulse & timestamp',
    '4 KPI metric cards counting up with delta indicators',
    'Multi-series telemetry chart drawing 3 lines with end glow',
    'Dual circular donut charts with live animated % metrics',
    'Regional performance bar chart with staggered growth',
    'Forex financial table with animated sparklines',
    'Global network abstraction with pulsing bezier routes'
  ],
  defaultAccent: '#6366f1', // Indigo
  presetAccents: ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
  renderFrame: (t, duration, W, H, opts) => {
    const p = clamp(t / duration, 0, 1);
    const titleEsc = escapeXml(opts.title || 'BUSINESS ANALYTICS');
    const accent = opts.accent || '#6366f1';
    const accent2 = '#06b6d4'; // Cyan
    const accent3 = '#10b981'; // Emerald

    // Deterministic camera zoom drift: 1.00 -> 1.05 centered
    const zoom = 1.0 + 0.05 * p;
    const cx = W / 2;
    const cy = H / 2;

    // Pulse for LIVE badge: exactly 12 complete seamless cycles across the duration
    const livePulse = 0.4 + 0.6 * Math.abs(Math.sin(p * Math.PI * 12));

    // KPI ease-in count progress: completes over the first 40% of duration (or p / 0.40)
    const kpiP = easeOutQuad(clamp(p / 0.40, 0, 1));
    const kpi1Val = (2845.2 * kpiP).toFixed(1);
    const kpi2Val = Math.round(94210 * kpiP).toLocaleString();
    const kpi3Val = (99.98 * kpiP).toFixed(2);
    const kpi4Val = (14.8 * kpiP).toFixed(1);

    // Multi-series line chart coordinates (normalized 0..100)
    // 3 series
    const chartW = 760;
    const chartH = 220;
    const chartX = 60;
    const chartY = 240;

    const series1 = [20, 35, 45, 40, 60, 55, 75, 70, 85, 92];
    const series2 = [15, 22, 30, 28, 45, 52, 60, 58, 65, 74];
    const series3 = [10, 18, 15, 25, 32, 40, 38, 48, 54, 62];

    const makeLinePath = (pts: number[]) => {
      return pts.map((pt, idx) => {
        const x = chartX + (idx / (pts.length - 1)) * chartW;
        const y = chartY + chartH - (pt / 100) * chartH;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');
    };

    const path1 = makeLinePath(series1);
    const path2 = makeLinePath(series2);
    const path3 = makeLinePath(series3);
    const pathLenEst = 900;
    // Lines draw themselves across the first 75% of duration
    const lineDrawP = clamp(p / 0.75, 0, 1);
    const dashOffset = pathLenEst * (1 - easeOutQuad(lineDrawP));

    // End dots positions
    const currIdx = Math.min(series1.length - 1, Math.floor(lineDrawP * (series1.length - 1)));
    const dotX = chartX + (currIdx / (series1.length - 1)) * chartW;
    const dot1Y = chartY + chartH - (series1[currIdx] / 100) * chartH;
    const dot2Y = chartY + chartH - (series2[currIdx] / 100) * chartH;

    // Donut charts: fill across the first 80% of duration
    const donut1P = easeOutQuad(clamp(p / 0.80, 0, 1)) * 0.84;
    const donut2P = easeOutQuad(clamp(p / 0.80, 0, 1)) * 0.68;
    const donutCircum = 2 * Math.PI * 46;

    // Horizontal bars
    const regions = [
      { name: 'North America', pct: 0.88, val: '$8.4M' },
      { name: 'Europe West', pct: 0.76, val: '$6.9M' },
      { name: 'Asia Pacific', pct: 0.92, val: '$9.1M' },
      { name: 'Latin America', pct: 0.54, val: '$4.2M' },
      { name: 'Middle East', pct: 0.65, val: '$5.5M' },
      { name: 'Africa South', pct: 0.42, val: '$3.1M' }
    ];

    // Forex rows slide in
    const forexRows = [
      { pair: 'EUR / USD', price: '1.0845', chg: '+0.42%', up: true },
      { pair: 'GBP / USD', price: '1.2718', chg: '+0.18%', up: true },
      { pair: 'USD / JPY', price: '155.62', chg: '-0.35%', up: false },
      { pair: 'USD / CHF', price: '0.9024', chg: '+0.05%', up: true },
      { pair: 'AUD / USD', price: '0.6651', chg: '-0.21%', up: false },
      { pair: 'USD / CAD', price: '1.3680', chg: '+0.12%', up: true }
    ];

    // Global network routes
    const netRoutes = [
      { sx: 1420, sy: 620, cx: 1560, cy: 560, ex: 1720, sy2: 640 },
      { sx: 1460, sy: 720, cx: 1600, cy: 780, ex: 1760, sy2: 700 },
      { sx: 1520, sy: 580, cx: 1640, cy: 680, ex: 1780, sy2: 820 }
    ];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:#070d18; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-b" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.0" />
    </linearGradient>
  </defs>

  <!-- Camera Drift Wrap -->
  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Grid pattern background -->
    <g opacity="0.07" stroke="#94a3b8" stroke-width="1">
      ${Array.from({ length: 19 }, (_, i) => `<line x1="${(i + 1) * 100}" y1="0" x2="${(i + 1) * 100}" y2="1080" />`).join('')}
      ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${(i + 1) * 90}" x2="1920" y2="${(i + 1) * 90}" />`).join('')}
    </g>

    <!-- Top Header Command Bar -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="#10b981" opacity="${livePulse.toFixed(2)}" filter="url(#glow-b)" />
    <text x="88" y="66" fill="#10b981" font-size="12" font-weight="700" letter-spacing="2">LIVE TELEMETRY</text>
    <text x="240" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1720" y="66" fill="#94a3b8" font-size="12" font-family="monospace">UTC T+${(t).toFixed(2)}s / ${(duration).toFixed(1)}s</text>

    <!-- 4 KPI Cards -->
    <!-- Card 1 -->
    <rect x="40" y="110" width="440" height="96" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="60" y="136" fill="#94a3b8" font-size="11" font-weight="600" letter-spacing="1">GROSS REVENUE (MRR)</text>
    <text x="60" y="180" fill="#ffffff" font-size="32" font-weight="800" font-family="monospace">$${kpi1Val}K</text>
    <rect x="360" y="125" width="100" height="26" rx="6" fill="#10b981" fill-opacity="0.15" />
    <text x="410" y="142" fill="#10b981" font-size="12" font-weight="700" text-anchor="middle">+24.8%</text>

    <!-- Card 2 -->
    <rect x="506" y="110" width="440" height="96" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="526" y="136" fill="#94a3b8" font-size="11" font-weight="600" letter-spacing="1">ACTIVE SESSIONS</text>
    <text x="526" y="180" fill="#ffffff" font-size="32" font-weight="800" font-family="monospace">${kpi2Val}</text>
    <rect x="826" y="125" width="100" height="26" rx="6" fill="#10b981" fill-opacity="0.15" />
    <text x="876" y="142" fill="#10b981" font-size="12" font-weight="700" text-anchor="middle">+12.4%</text>

    <!-- Card 3 -->
    <rect x="974" y="110" width="440" height="96" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="994" y="136" fill="#94a3b8" font-size="11" font-weight="600" letter-spacing="1">UPTIME SLA</text>
    <text x="994" y="180" fill="#ffffff" font-size="32" font-weight="800" font-family="monospace">${kpi3Val}%</text>
    <rect x="1294" y="125" width="100" height="26" rx="6" fill="#10b981" fill-opacity="0.15" />
    <text x="1344" y="142" fill="#10b981" font-size="12" font-weight="700" text-anchor="middle">STABLE</text>

    <!-- Card 4 -->
    <rect x="1440" y="110" width="440" height="96" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="1460" y="136" fill="#94a3b8" font-size="11" font-weight="600" letter-spacing="1">CONVERSION RATE</text>
    <text x="1460" y="180" fill="#ffffff" font-size="32" font-weight="800" font-family="monospace">${kpi4Val}%</text>
    <rect x="1760" y="125" width="100" height="26" rx="6" fill="#ef4444" fill-opacity="0.15" />
    <text x="1810" y="142" fill="#ef4444" font-size="12" font-weight="700" text-anchor="middle">-1.2%</text>

    <!-- Center Left Panel: Multi-Series Line Chart -->
    <rect x="40" y="222" width="820" height="360" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="60" y="254" fill="#ffffff" font-size="14" font-weight="700" letter-spacing="0.5">METRIC VELOCITY OVER TIME</text>
    <text x="60" y="272" fill="#64748b" font-size="11">Real-time dynamic multi-series streaming analytics</text>

    <!-- Chart Grid Lines -->
    ${[0, 1, 2, 3, 4].map(i => {
      const gy = chartY + (i / 4) * chartH;
      return `<line x1="${chartX}" y1="${gy}" x2="${chartX + chartW}" y2="${gy}" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
      <text x="${chartX - 10}" y="${gy + 4}" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">${100 - i * 25}%</text>`;
    }).join('')}

    <!-- Series Lines -->
    <path d="${path3}" fill="none" stroke="${accent3}" stroke-width="2.5" stroke-dasharray="${pathLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" opacity="0.75" />
    <path d="${path2}" fill="none" stroke="${accent2}" stroke-width="3" stroke-dasharray="${pathLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" opacity="0.9" />
    <path d="${path1}" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="${pathLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" filter="url(#glow-b)" />

    <!-- Glowing End Dots -->
    ${lineDrawP > 0.05 ? `
      <circle cx="${dotX.toFixed(1)}" cy="${dot1Y.toFixed(1)}" r="6" fill="${accent}" filter="url(#glow-b)" />
      <circle cx="${dotX.toFixed(1)}" cy="${dot2Y.toFixed(1)}" r="5" fill="${accent2}" />
    ` : ''}

    <!-- Center Right Top: 2 Donut Charts -->
    <rect x="880" y="222" width="460" height="360" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="900" y="254" fill="#ffffff" font-size="14" font-weight="700">CAPACITY ALLOCATION</text>
    <text x="900" y="272" fill="#64748b" font-size="11">Compute cluster &amp; memory saturation</text>

    <!-- Donut 1 -->
    <g transform="translate(990, 390)">
      <circle cx="0" cy="0" r="46" fill="none" stroke="#1e293b" stroke-width="14" />
      <circle cx="0" cy="0" r="46" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${(donutCircum * donut1P).toFixed(1)} ${donutCircum}"
        transform="rotate(-90)" />
      <text x="0" y="6" fill="#ffffff" font-size="18" font-weight="800" text-anchor="middle" font-family="monospace">
        ${Math.round(donut1P * 100)}%
      </text>
      <text x="0" y="70" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">CPU NODES</text>
    </g>

    <!-- Donut 2 -->
    <g transform="translate(1230, 390)">
      <circle cx="0" cy="0" r="46" fill="none" stroke="#1e293b" stroke-width="14" />
      <circle cx="0" cy="0" r="46" fill="none" stroke="${accent2}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${(donutCircum * donut2P).toFixed(1)} ${donutCircum}"
        transform="rotate(-90)" />
      <text x="0" y="6" fill="#ffffff" font-size="18" font-weight="800" text-anchor="middle" font-family="monospace">
        ${Math.round(donut2P * 100)}%
      </text>
      <text x="0" y="70" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">RAM POOL</text>
    </g>

    <!-- Global Network Panel (Far Right) -->
    <rect x="1360" y="222" width="520" height="360" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="1380" y="254" fill="#ffffff" font-size="14" font-weight="700">GLOBAL NETWORK ARCS</text>
    <text x="1380" y="272" fill="#64748b" font-size="11">Real-time fiber backbones &amp; latency routing</text>

    <!-- Dotted World background placeholder -->
    <g opacity="0.3">
      ${Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 14 }, (_, col) =>
          `<circle cx="${1400 + col * 34}" cy="${300 + row * 28}" r="2" fill="#64748b" />`
        ).join('')
      ).join('')}
    </g>

    <!-- Arcs with traveling light pulses -->
    ${netRoutes.map((r, idx) => {
      const arcT = (p * 3 + idx * 0.33) % 1;
      const t1 = 1 - arcT;
      // Quadratic bezier point: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
      const px = t1 * t1 * r.sx + 2 * t1 * arcT * r.cx + arcT * arcT * r.ex;
      const py = t1 * t1 * r.sy + 2 * t1 * arcT * r.cy + arcT * arcT * r.sy2;

      return `
        <path d="M ${r.sx} ${r.sy} Q ${r.cx} ${r.cy} ${r.ex} ${r.sy2}" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.5" />
        <circle cx="${r.sx}" cy="${r.sy}" r="4" fill="${accent}" />
        <circle cx="${r.ex}" cy="${r.sy2}" r="4" fill="${accent2}" />
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="#ffffff" filter="url(#glow-b)" />
      `;
    }).join('')}

    <!-- Bottom Left: Regional Performance Horizontal Bars -->
    <rect x="40" y="600" width="820" height="440" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="60" y="632" fill="#ffffff" font-size="14" font-weight="700">REGIONAL REVENUE BREAKDOWN</text>
    <text x="60" y="650" fill="#64748b" font-size="11">Target attainment by geographic market territory</text>

    ${regions.map((reg, idx) => {
      const barY = 675 + idx * 56;
      // Staggered growth
      const barDelay = idx * 0.08;
      const barLocalP = clamp((p - barDelay) / 0.5, 0, 1);
      const barEased = easeOutQuad(barLocalP);
      const maxBarW = 540;
      const currentBarW = maxBarW * reg.pct * barEased;

      return `
        <g>
          <text x="60" y="${barY + 16}" fill="#cbd5e1" font-size="12" font-weight="600">${reg.name}</text>
          <rect x="200" y="${barY}" width="${maxBarW}" height="22" rx="4" fill="#1e293b" />
          <rect x="200" y="${barY}" width="${Math.max(0, currentBarW).toFixed(1)}" height="22" rx="4" fill="${accent}" />
          <text x="${(210 + currentBarW).toFixed(1)}" y="${barY + 16}" fill="#ffffff" font-size="11" font-weight="700" font-family="monospace">
            ${reg.val} (${Math.round(reg.pct * 100 * barEased)}%)
          </text>
        </g>
      `;
    }).join('')}

    <!-- Bottom Right: Forex Data Table with Sparklines -->
    <rect x="880" y="600" width="1000" height="440" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="900" y="632" fill="#ffffff" font-size="14" font-weight="700">CURRENCY PAIRS &amp; TREASURY SPREADS</text>
    <text x="900" y="650" fill="#64748b" font-size="11">Interbank settlement rates with sliding ledger rows</text>

    <!-- Table Header -->
    <rect x="900" y="668" width="960" height="30" fill="#1e293b" rx="4" />
    <text x="920" y="688" fill="#94a3b8" font-size="11" font-weight="600">CURRENCY PAIR</text>
    <text x="1150" y="688" fill="#94a3b8" font-size="11" font-weight="600">SPOT RATE</text>
    <text x="1350" y="688" fill="#94a3b8" font-size="11" font-weight="600">24H CHANGE</text>
    <text x="1580" y="688" fill="#94a3b8" font-size="11" font-weight="600">SPARKLINE</text>

    <!-- Table Rows -->
    ${forexRows.map((row, idx) => {
      const rowY = 712 + idx * 52;
      const rowDelay = idx * 0.07;
      const rowSlide = easeOutQuad(clamp((p - rowDelay) / 0.4, 0, 1));
      const offsetX = (1 - rowSlide) * 120;
      const rowOpacity = rowSlide;

      // Seeded sparkline
      const rng = createRng(100 + idx);
      const sparkPts = Array.from({ length: 8 }, (_, sIdx) => {
        const sx = 1580 + sIdx * 24;
        const sy = rowY + 12 + (rng() - 0.5) * 20;
        return `${sIdx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      }).join(' ');

      return `
        <g transform="translate(${offsetX.toFixed(1)}, 0)" opacity="${rowOpacity.toFixed(2)}">
          <line x1="900" y1="${rowY + 36}" x2="1860" y2="${rowY + 36}" stroke="#1e293b" stroke-width="1" />
          <text x="920" y="${rowY + 20}" fill="#ffffff" font-size="13" font-weight="700">${row.pair}</text>
          <text x="1150" y="${rowY + 20}" fill="#e2e8f0" font-size="13" font-family="monospace">${row.price}</text>
          <rect x="1350" y="${rowY + 4}" width="80" height="22" rx="4" fill="${row.up ? '#10b981' : '#ef4444'}" fill-opacity="0.15" />
          <text x="1390" y="${rowY + 19}" fill="${row.up ? '#10b981' : '#ef4444'}" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">${escapeXml(row.chg)}</text>
          <path d="${sparkPts}" fill="none" stroke="${row.up ? '#10b981' : '#ef4444'}" stroke-width="2" />
        </g>
      `;
    }).join('')}
  </g>
</svg>`;
  }
};

// ============================================================================
// TEMPLATE 2: Finance Trading Dashboard
// ============================================================================
const templateFinanceTrading: RemotionTemplate = {
  id: 'finance-trading',
  name: 'Finance Trading Dashboard',
  tagline: 'Dark green-black financial terminal with candlestick action and order book',
  defaultTitle: 'ALPHA QUANTITATIVE TERMINAL',
  scenes: [
    'Seamless continuous scrolling ticker tape at the top',
    'Candlestick chart forming candle-by-candle with wicks',
    'Big live price ticker with flashing delta badge',
    'Real-time order book with depth bid / ask bars',
    'Portfolio asset allocation segmented donut chart',
    'Financial news feed with sliding chronological headlines'
  ],
  defaultAccent: '#10b981', // Emerald green
  presetAccents: ['#10b981', '#22c55e', '#14b8a6', '#06b6d4', '#eab308', '#f97316'],
  renderFrame: (t, duration, W, H, opts) => {
    const p = clamp(t / duration, 0, 1);
    const titleEsc = escapeXml(opts.title || 'FINANCE TRADING TERMINAL');
    const accent = opts.accent || '#10b981';

    // Ticker items
    const tickers = [
      { sym: 'BTC/USD', price: '68,420.50', chg: '+4.2%' },
      { sym: 'ETH/USD', price: '3,892.10', chg: '+2.8%' },
      { sym: 'NVDA', price: '128.40', chg: '+5.1%' },
      { sym: 'AAPL', price: '214.30', chg: '-0.4%' },
      { sym: 'TSLA', price: '248.90', chg: '+3.3%' },
      { sym: 'SOL/USD', price: '184.25', chg: '+7.4%' },
      { sym: 'MSFT', price: '448.20', chg: '+1.1%' }
    ];

    // Seamless ticker translation: exactly 2 complete integer loops per video duration
    const tickerItemW = 260;
    const tickerTotalW = tickers.length * tickerItemW;
    const tickerOffset = (p * 2 * tickerTotalW) % tickerTotalW;

    // Candlesticks (deterministic price walk): distribute 28 candles evenly across the full duration
    const rng = createRng(42);
    const totalCandles = 28;
    // Candle i appears at t = i * duration / totalCandles, finishing building exactly on the last frame
    const candlesToRender = Math.max(1, Math.min(totalCandles, Math.floor(p * totalCandles) + 1));
    let lastClose = 240;

    const candleData = [];
    for (let i = 0; i < totalCandles; i++) {
      const delta = (rng() - 0.48) * 35;
      const open = lastClose;
      const close = open + delta;
      const high = Math.max(open, close) + rng() * 15;
      const low = Math.min(open, close) - rng() * 15;
      lastClose = close;
      candleData.push({ open, close, high, low, up: close >= open });
    }

    // Big Price Display: 16 full oscillation cycles across duration
    const currentPriceBase = 68420.5;
    const tickOsc = Math.sin(p * Math.PI * 32) * 14.2;
    const livePrice = (currentPriceBase + tickOsc).toFixed(2);
    const flashTick = Math.abs(Math.cos(p * Math.PI * 32)) > 0.7;

    // Order Book Depth Rows (8 bids, 8 asks): update across 12 cycles across duration
    const orderRng = createRng(88 + Math.floor(p * 12));
    const bids = Array.from({ length: 7 }, (_, i) => ({
      price: (68410 - i * 5).toFixed(1),
      amount: (0.4 + orderRng() * 1.8).toFixed(3),
      depth: 30 + orderRng() * 60
    }));
    const asks = Array.from({ length: 7 }, (_, i) => ({
      price: (68425 + i * 5).toFixed(1),
      amount: (0.3 + orderRng() * 1.5).toFixed(3),
      depth: 25 + orderRng() * 65
    }));

    // News Feed items
    const news = [
      { time: '14:32:05', title: 'Federal Reserve holds benchmark rate steady as expected', tag: 'MACRO' },
      { time: '14:28:40', title: 'Institutional spot ETF inflows surpass $1.2B in weekly volume', tag: 'CRYPTO' },
      { time: '14:15:12', title: 'Tech earnings rally spurs renewed high-yield treasury appetite', tag: 'EQUITIES' },
      { time: '14:02:50', title: 'Energy futures rebound on global supply chain realignment', tag: 'COMMODITIES' }
    ];

    // Portfolio Donut Segments
    const portCircum = 2 * Math.PI * 52;
    const portSegments = [
      { label: 'EQUITIES', pct: 0.45, color: accent },
      { label: 'CRYPTO', pct: 0.30, color: '#38bdf8' },
      { label: 'BONDS', pct: 0.15, color: '#f59e0b' },
      { label: 'CASH', pct: 0.10, color: '#94a3b8' }
    ];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:#040d08; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-g" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Top Scrolling Ticker Tape -->
  <rect x="0" y="0" width="1920" height="46" fill="#02140a" stroke="#052e16" stroke-width="1.5" />
  <g transform="translate(${-tickerOffset.toFixed(1)}, 0)">
    <!-- Duplicate tickers twice for seamless wrap -->
    ${[0, 1, 2].map(wrapIdx =>
      tickers.map((tItem, idx) => {
        const itemX = wrapIdx * tickerTotalW + idx * tickerItemW;
        return `
          <g transform="translate(${itemX}, 0)">
            <text x="20" y="28" fill="#ffffff" font-size="12" font-weight="800">${tItem.sym}</text>
            <text x="100" y="28" fill="#a7f3d0" font-size="12" font-family="monospace">${tItem.price}</text>
            <text x="180" y="28" fill="${tItem.chg.startsWith('+') ? '#34d399' : '#f87171'}" font-size="12" font-weight="700">${tItem.chg}</text>
            <circle cx="${tickerItemW - 10}" cy="24" r="2" fill="#064e3b" />
          </g>
        `;
      }).join('')
    ).join('')}
  </g>

  <!-- Main Terminal Header -->
  <rect x="40" y="66" width="1840" height="60" rx="8" fill="#061f12" stroke="#064e3b" stroke-width="1" />
  <text x="64" y="103" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1">${titleEsc}</text>
  <rect x="620" y="80" width="84" height="30" rx="6" fill="#059669" fill-opacity="0.2" stroke="#059669" stroke-width="1" />
  <text x="662" y="100" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">PRO FEED</text>
  <text x="1740" y="102" fill="#6ee7b7" font-size="13" font-family="monospace">DELAY: 0.4ms</text>

  <!-- Left: Candlestick Main Chart -->
  <rect x="40" y="146" width="1200" height="520" rx="8" fill="#061a10" stroke="#064e3b" stroke-width="1" />

  <!-- Big Price Display inside Candlestick Top Bar -->
  <g transform="translate(64, 180)">
    <text x="0" y="0" fill="#9ca3af" font-size="11" font-weight="600">BTC / USD PERPETUAL CONTRACT</text>
    <text x="0" y="38" fill="#ffffff" font-size="36" font-weight="800" font-family="monospace">$${livePrice}</text>
    <rect x="300" y="10" width="90" height="28" rx="6" fill="${flashTick ? '#10b981' : '#059669'}" fill-opacity="${flashTick ? '0.4' : '0.2'}" />
    <text x="345" y="29" fill="#34d399" font-size="12" font-weight="700" text-anchor="middle">+4.24% ▲</text>
  </g>

  <!-- Candlestick Chart Area -->
  <g transform="translate(60, 240)">
    <!-- Horizontal Grid Lines -->
    ${[0, 1, 2, 3, 4].map(gi => `
      <line x1="0" y1="${gi * 70}" x2="1140" y2="${gi * 70}" stroke="#064e3b" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6" />
      <text x="1145" y="${gi * 70 + 4}" fill="#6ee7b7" font-size="10" font-family="monospace">${(68550 - gi * 50)}</text>
    `).join('')}

    <!-- Candles -->
    ${candleData.slice(0, candlesToRender).map((c, cIdx) => {
      const cx = 30 + cIdx * 38;
      const topY = Math.min(c.open, c.close);
      const botY = Math.max(c.open, c.close);
      const bodyH = Math.max(3, botY - topY);
      const candleColor = c.up ? '#10b981' : '#ef4444';

      return `
        <!-- Wick -->
        <line x1="${cx}" y1="${c.high.toFixed(1)}" x2="${cx}" y2="${c.low.toFixed(1)}" stroke="${candleColor}" stroke-width="1.8" />
        <!-- Body -->
        <rect x="${(cx - 12).toFixed(1)}" y="${topY.toFixed(1)}" width="24" height="${bodyH.toFixed(1)}" rx="2" fill="${candleColor}" />
      `;
    }).join('')}

    <!-- Dynamic Price Line moving across -->
    ${candlesToRender > 1 ? `
      <polyline points="${candleData.slice(0, candlesToRender).map((cd, idx) => `${30 + idx * 38},${cd.close.toFixed(1)}`).join(' ')}"
        fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.4" />
    ` : ''}
  </g>

  <!-- Right: Order Book Panel -->
  <rect x="1260" y="146" width="620" height="520" rx="8" fill="#061a10" stroke="#064e3b" stroke-width="1" />
  <text x="1284" y="178" fill="#ffffff" font-size="14" font-weight="700">ORDER BOOK (L2 DEPTH)</text>

  <!-- Order Book Columns Header -->
  <text x="1284" y="208" fill="#6ee7b7" font-size="11" font-weight="600">BID PRICE</text>
  <text x="1400" y="208" fill="#6ee7b7" font-size="11" font-weight="600">SIZE</text>
  <text x="1560" y="208" fill="#f87171" font-size="11" font-weight="600">ASK PRICE</text>
  <text x="1680" y="208" fill="#f87171" font-size="11" font-weight="600">SIZE</text>

  <!-- Order Book Rows -->
  ${bids.map((b, idx) => {
    const a = asks[idx];
    const rowY = 226 + idx * 36;
    return `
      <!-- Bid depth bar -->
      <rect x="1280" y="${rowY}" width="${(b.depth * 2).toFixed(1)}" height="26" fill="#10b981" fill-opacity="0.12" rx="3" />
      <text x="1284" y="${rowY + 18}" fill="#34d399" font-size="12" font-family="monospace" font-weight="700">${b.price}</text>
      <text x="1400" y="${rowY + 18}" fill="#e2e8f0" font-size="12" font-family="monospace">${b.amount}</text>

      <!-- Ask depth bar -->
      <rect x="1556" y="${rowY}" width="${(a.depth * 2).toFixed(1)}" height="26" fill="#ef4444" fill-opacity="0.12" rx="3" />
      <text x="1560" y="${rowY + 18}" fill="#f87171" font-size="12" font-family="monospace" font-weight="700">${a.price}</text>
      <text x="1680" y="${rowY + 18}" fill="#e2e8f0" font-size="12" font-family="monospace">${a.amount}</text>
    `;
  }).join('')}

  <!-- Spread Indicator -->
  <rect x="1280" y="500" width="580" height="34" rx="6" fill="#022c22" stroke="#064e3b" stroke-width="1" />
  <text x="1570" y="522" fill="#a7f3d0" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">SPREAD: 0.50 USD (0.0007%)</text>

  <!-- Bottom Left: Portfolio Donut -->
  <rect x="40" y="686" width="620" height="354" rx="8" fill="#061a10" stroke="#064e3b" stroke-width="1" />
  <text x="64" y="718" fill="#ffffff" font-size="14" font-weight="700">PORTFOLIO ALLOCATION</text>
  <text x="64" y="736" fill="#6ee7b7" font-size="11">Total AUM: $14,892,400</text>

  <!-- Donut SVG -->
  <g transform="translate(180, 860)">
    <circle cx="0" cy="0" r="52" fill="none" stroke="#064e3b" stroke-width="18" />
    ${(() => {
      let accumulated = 0;
      return portSegments.map(seg => {
        // Donut segments animate in across the first 60% of duration
        const segDash = seg.pct * portCircum * easeOutQuad(clamp(p / 0.60, 0, 1));
        const segRot = (accumulated * 360) - 90;
        accumulated += seg.pct;
        return `
          <circle cx="0" cy="0" r="52" fill="none" stroke="${seg.color}" stroke-width="18"
            stroke-dasharray="${segDash.toFixed(1)} ${portCircum}"
            transform="rotate(${segRot})" />
        `;
      }).join('');
    })()}
    <text x="0" y="6" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle" font-family="monospace">100%</text>
  </g>

  <!-- Portfolio Legends -->
  <g transform="translate(320, 780)">
    ${portSegments.map((seg, idx) => `
      <g transform="translate(0, ${idx * 40})">
        <rect x="0" y="0" width="14" height="14" rx="3" fill="${seg.color}" />
        <text x="26" y="12" fill="#ffffff" font-size="12" font-weight="700">${seg.label}</text>
        <text x="140" y="12" fill="#a7f3d0" font-size="12" font-family="monospace">${Math.round(seg.pct * 100)}%</text>
      </g>
    `).join('')}
  </g>

  <!-- Bottom Right: Live News Wire -->
  <rect x="680" y="686" width="1200" height="354" rx="8" fill="#061a10" stroke="#064e3b" stroke-width="1" />
  <text x="704" y="718" fill="#ffffff" font-size="14" font-weight="700">REAL-TIME FINANCIAL HEADLINES</text>
  <text x="704" y="736" fill="#6ee7b7" font-size="11">Automated news sentiment parser feed</text>

  <g transform="translate(704, 760)">
    ${news.map((item, idx) => {
      // News headlines stagger in across the first 75% of duration
      const itemDelay = idx * 0.12;
      const itemP = clamp((p - itemDelay) / 0.30, 0, 1);
      const rowAlpha = easeOutQuad(itemP);
      const slideX = (1 - rowAlpha) * 60;
      return `
        <g transform="translate(${slideX.toFixed(1)}, ${idx * 64})" opacity="${rowAlpha.toFixed(2)}">
          <rect x="0" y="0" width="1150" height="52" rx="6" fill="#022c22" stroke="#064e3b" stroke-width="1" />
          <rect x="16" y="14" width="70" height="24" rx="4" fill="#065f46" />
          <text x="51" y="30" fill="#a7f3d0" font-size="10" font-weight="700" text-anchor="middle">${escapeXml(item.tag)}</text>
          <text x="100" y="31" fill="#6ee7b7" font-size="12" font-family="monospace">${escapeXml(item.time)}</text>
          <text x="190" y="31" fill="#ffffff" font-size="13" font-weight="600">${escapeXml(item.title)}</text>
        </g>
      `;
    }).join('')}
  </g>
</svg>`;
  }
};

// ============================================================================
// TEMPLATE 3: AI Tech Dashboard
// ============================================================================
const templateAiTech: RemotionTemplate = {
  id: 'ai-tech',
  name: 'AI Tech Dashboard',
  tagline: 'Dark purple cyber-interface with neural nets, terminal logs, and inference dials',
  defaultTitle: 'NEURAL ACCELERATOR ENGINE V4',
  scenes: [
    'Deep neural network diagram with 4 interconnected layers',
    'Traveling synapse pulses along neural weights',
    'Typing cyberpunk terminal logs with blinking block cursor',
    'Dual progress rings for Training and Real-time Inference',
    'Multi-core GPU telemetry grid (8 micro-meters counting)',
    'Dynamic latency histogram showing frame timing jitter'
  ],
  defaultAccent: '#06b6d4', // Cyan
  presetAccents: ['#06b6d4', '#d946ef', '#a855f7', '#ec4899', '#3b82f6', '#10b981'],
  renderFrame: (t, duration, W, H, opts) => {
    const p = clamp(t / duration, 0, 1);
    const titleEsc = escapeXml(opts.title || 'NEURAL ACCELERATOR');
    const accent = opts.accent || '#06b6d4'; // Cyan
    const magenta = '#d946ef';

    // Neural Network layers: 5 - 7 - 7 - 4 nodes
    const layerSizes = [5, 7, 7, 4];
    const nnX = 100;
    const nnY = 220;
    const nnW = 560;
    const nnH = 340;

    const layerXCoords = [nnX, nnX + nnW * 0.33, nnX + nnW * 0.66, nnX + nnW];

    // Compute node coordinates
    const nodes: { x: number; y: number; layer: number; index: number }[][] = layerSizes.map((count, lIdx) => {
      const lx = layerXCoords[lIdx];
      return Array.from({ length: count }, (_, nIdx) => {
        const ly = nnY + (nIdx + 0.5) * (nnH / count);
        return { x: lx, y: ly, layer: lIdx, index: nIdx };
      });
    });

    // Neural pulses along edges: exactly 8 complete speed-scaled cycles across duration
    const pulseCount = 12;
    const rng = createRng(777);
    const pulseEdges = [];
    for (let i = 0; i < pulseCount; i++) {
      const l = Math.floor(rng() * 3);
      const fromNode = Math.floor(rng() * layerSizes[l]);
      const toNode = Math.floor(rng() * layerSizes[l + 1]);
      const cycles = Math.round(6 + rng() * 6); // integer cycles per duration
      const phase = rng();
      pulseEdges.push({ l, fromNode, toNode, cycles, phase });
    }

    // Terminal typing logs: typing spreads across the first 65% of duration
    const fullLogs = [
      '[INIT] Loading model checkpoint tensor weights (fp16)...',
      '[CUDA] Allocated 24.8 GB VRAM across 8 compute nodes.',
      '[OPTIM] KV-Cache quantized with FlashAttention-3 kernels.',
      '[EPOCH] Loss converged to 0.0142 | Perplexity: 1.04',
      '[INFER] Batch throughput reached 18,420 tokens/sec.',
      '[STATUS] Streaming pipeline operational. Zero errors.'
    ];

    // Total characters across all logs
    const totalChars = fullLogs.reduce((acc, str) => acc + str.length, 0);
    const typedCharsCount = Math.floor(clamp(p / 0.65, 0, 1) * totalChars);

    let charBudget = typedCharsCount;
    const displayedLogs: string[] = [];
    for (const logLine of fullLogs) {
      if (charBudget >= logLine.length) {
        displayedLogs.push(logLine);
        charBudget -= logLine.length;
      } else if (charBudget > 0) {
        displayedLogs.push(logLine.slice(0, charBudget));
        charBudget = 0;
      } else {
        break;
      }
    }

    // Cursor blink: 18 integer blinks across duration
    const showCursor = Math.floor(p * 36) % 2 === 0;

    // Dual Progress Rings: count up across the full duration
    // Training convergence finishes smoothly at 100% at the end of duration (p / 0.95)
    const trainP = easeOutQuad(clamp(p / 0.95, 0, 1));
    // Inference oscillates smoothly with exactly 8 full sine waves
    const inferP = clamp(0.72 + 0.24 * Math.sin(p * Math.PI * 16), 0, 1);
    const ringCircum = 2 * Math.PI * 48;

    // GPU Cores (8 micro-meters)
    const gpuCores = [
      { name: 'GPU 0', pct: 94 },
      { name: 'GPU 1', pct: 98 },
      { name: 'GPU 2', pct: 92 },
      { name: 'GPU 3', pct: 96 },
      { name: 'GPU 4', pct: 89 },
      { name: 'GPU 5', pct: 95 },
      { name: 'GPU 6', pct: 91 },
      { name: 'GPU 7', pct: 99 }
    ];

    // Latency Histogram bars: updates across 16 stepped intervals across duration
    const histRng = createRng(303 + Math.floor(p * 16));
    const histBars = Array.from({ length: 24 }, () => Math.round(15 + histRng() * 70));

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:#0a0518; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-ai" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Header Cyber Bar -->
  <rect x="40" y="30" width="1840" height="64" rx="8" fill="#130b2c" stroke="#2d1b69" stroke-width="1.5" />
  <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-ai)" />
  <text x="90" y="66" fill="${accent}" font-size="12" font-weight="800" letter-spacing="2">NEURAL PIPELINE</text>
  <text x="270" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
  <text x="1720" y="66" fill="#a855f7" font-size="12" font-family="monospace">FPS: 60 | LATENCY: 2.1ms</text>

  <!-- Left: Neural Network Panel -->
  <rect x="40" y="114" width="700" height="490" rx="8" fill="#110926" stroke="#2d1b69" stroke-width="1.5" />
  <text x="64" y="146" fill="#ffffff" font-size="14" font-weight="700">SYNAPTIC TOPOLOGY ARCHITECTURE</text>
  <text x="64" y="164" fill="#a855f7" font-size="11">4-layer deep transformer attention representation</text>

  <!-- Layer connections (lines) -->
  <g opacity="0.25">
    ${nodes.slice(0, -1).map((currentLayer, lIdx) => {
      const nextLayer = nodes[lIdx + 1];
      return currentLayer.map(src =>
        nextLayer.map(dst =>
          `<line x1="${src.x}" y1="${src.y}" x2="${dst.x}" y2="${dst.y}" stroke="${accent}" stroke-width="1" />`
        ).join('')
      ).join('');
    }).join('')}
  </g>

  <!-- Traveling Synapse Pulses -->
  ${pulseEdges.map(pe => {
    const src = nodes[pe.l][pe.fromNode];
    const dst = nodes[pe.l + 1][pe.toNode];
    const prog = (p * pe.cycles + pe.phase) % 1;
    const px = src.x + (dst.x - src.x) * prog;
    const py = src.y + (dst.y - src.y) * prog;
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${prog > 0.5 ? magenta : '#ffffff'}" filter="url(#glow-ai)" />`;
  }).join('')}

  <!-- Layer Nodes -->
  ${nodes.map((layerNodes, lIdx) =>
    layerNodes.map(node => {
      const nodeOsc = 0.6 + 0.4 * Math.sin(p * Math.PI * 12 + node.index * 0.8 + lIdx);
      return `
        <circle cx="${node.x}" cy="${node.y}" r="8" fill="#130b2c" stroke="${accent}" stroke-width="2" />
        <circle cx="${node.x}" cy="${node.y}" r="${(5 * nodeOsc).toFixed(1)}" fill="${lIdx === 3 ? magenta : accent}" opacity="${nodeOsc.toFixed(2)}" filter="url(#glow-ai)" />
      `;
    }).join('')
  ).join('')}

  <!-- Layer Labels -->
  <text x="${nnX}" y="${nnY + nnH + 24}" fill="#a855f7" font-size="10" font-weight="700" text-anchor="middle">INPUT</text>
  <text x="${nnX + nnW * 0.33}" y="${nnY + nnH + 24}" fill="#a855f7" font-size="10" font-weight="700" text-anchor="middle">ENCODER</text>
  <text x="${nnX + nnW * 0.66}" y="${nnY + nnH + 24}" fill="#a855f7" font-size="10" font-weight="700" text-anchor="middle">ATTN</text>
  <text x="${nnX + nnW}" y="${nnY + nnH + 24}" fill="#a855f7" font-size="10" font-weight="700" text-anchor="middle">OUTPUT</text>

  <!-- Center: Terminal Logs -->
  <rect x="760" y="114" width="700" height="490" rx="8" fill="#080314" stroke="#2d1b69" stroke-width="1.5" />
  <rect x="760" y="114" width="700" height="34" rx="8" fill="#130b2c" />
  <circle cx="780" cy="131" r="5" fill="#ef4444" />
  <circle cx="798" cy="131" r="5" fill="#eab308" />
  <circle cx="816" cy="131" r="5" fill="#10b981" />
  <text x="836" y="135" fill="#a855f7" font-size="11" font-family="monospace">bash /workspace/train_cluster.sh</text>

  <!-- Log text lines -->
  <g transform="translate(780, 180)">
    ${displayedLogs.map((log, idx) => {
      const isLast = idx === displayedLogs.length - 1;
      return `
        <text x="0" y="${idx * 42}" fill="${idx === displayedLogs.length - 1 ? '#38bdf8' : '#cbd5e1'}" font-size="13" font-family="monospace">
          ${escapeXml(log)}${isLast && showCursor ? ' █' : ''}
        </text>
      `;
    }).join('')}
  </g>

  <!-- Right: Dual Progress Rings (Training and Inference) -->
  <rect x="1480" y="114" width="400" height="490" rx="8" fill="#110926" stroke="#2d1b69" stroke-width="1.5" />
  <text x="1504" y="146" fill="#ffffff" font-size="14" font-weight="700">EXECUTION METRICS</text>

  <!-- Ring 1: Training -->
  <g transform="translate(1680, 240)">
    <circle cx="0" cy="0" r="48" fill="none" stroke="#2d1b69" stroke-width="12" />
    <circle cx="0" cy="0" r="48" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${(ringCircum * trainP).toFixed(1)} ${ringCircum}"
      transform="rotate(-90)" filter="url(#glow-ai)" />
    <text x="0" y="6" fill="#ffffff" font-size="18" font-weight="800" text-anchor="middle" font-family="monospace">
      ${Math.round(trainP * 100)}%
    </text>
    <text x="0" y="72" fill="#a855f7" font-size="11" font-weight="700" text-anchor="middle">TRAINING CONVERGENCE</text>
  </g>

  <!-- Ring 2: Inference -->
  <g transform="translate(1680, 440)">
    <circle cx="0" cy="0" r="48" fill="none" stroke="#2d1b69" stroke-width="12" />
    <circle cx="0" cy="0" r="48" fill="none" stroke="${magenta}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${(ringCircum * inferP).toFixed(1)} ${ringCircum}"
      transform="rotate(-90)" filter="url(#glow-ai)" />
    <text x="0" y="6" fill="#ffffff" font-size="18" font-weight="800" text-anchor="middle" font-family="monospace">
      ${Math.round(inferP * 100)}%
    </text>
    <text x="0" y="72" fill="#a855f7" font-size="11" font-weight="700" text-anchor="middle">INFERENCE THROUGHPUT</text>
  </g>

  <!-- Bottom Left: 8 GPU Micro-Meters -->
  <rect x="40" y="624" width="940" height="416" rx="8" fill="#110926" stroke="#2d1b69" stroke-width="1.5" />
  <text x="64" y="656" fill="#ffffff" font-size="14" font-weight="700">GPU COMPUTE CLUSTER TELEMETRY (8 NODES)</text>
  <text x="64" y="674" fill="#a855f7" font-size="11">Per-node tensor core compute &amp; memory bandwidth saturation</text>

  <g transform="translate(64, 700)">
    ${gpuCores.map((gpu, idx) => {
      const gx = (idx % 4) * 215;
      const gy = Math.floor(idx / 4) * 140;
      // GPU telemetry counts up across the first 50% of duration
      const coreEased = easeOutQuad(clamp(p / 0.50, 0, 1));
      const coreVal = Math.round(gpu.pct * coreEased);

      return `
        <g transform="translate(${gx}, ${gy})">
          <rect x="0" y="0" width="195" height="110" rx="6" fill="#190e38" stroke="#2d1b69" stroke-width="1" />
          <text x="16" y="28" fill="#cbd5e1" font-size="12" font-weight="700">${gpu.name}</text>
          <text x="175" y="28" fill="${accent}" font-size="12" font-family="monospace" text-anchor="end">${coreVal}%</text>
          <rect x="16" y="44" width="160" height="14" rx="4" fill="#2d1b69" />
          <rect x="16" y="44" width="${Math.max(0, 160 * (coreVal / 100)).toFixed(1)}" height="14" rx="4" fill="${coreVal > 95 ? magenta : accent}" />
          <text x="16" y="86" fill="#a855f7" font-size="10" font-family="monospace">TEMP: ${58 + (idx * 2)}°C</text>
          <text x="175" y="86" fill="#10b981" font-size="10" font-weight="600" text-anchor="end">ONLINE</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- Bottom Right: Latency Histogram -->
  <rect x="1000" y="624" width="880" height="416" rx="8" fill="#110926" stroke="#2d1b69" stroke-width="1.5" />
  <text x="1024" y="656" fill="#ffffff" font-size="14" font-weight="700">FRAME LATENCY JITTER HISTOGRAM</text>
  <text x="1024" y="674" fill="#a855f7" font-size="11">Real-time inter-token variance (ms)</text>

  <g transform="translate(1040, 720)">
    <!-- Baseline grid -->
    <line x1="0" y1="240" x2="800" y2="240" stroke="#2d1b69" stroke-width="1" />
    ${[0, 1, 2, 3].map(i => `
      <line x1="0" y1="${i * 60}" x2="800" y2="${i * 60}" stroke="#2d1b69" stroke-width="1" stroke-dasharray="3 3" opacity="0.4" />
      <text x="-10" y="${i * 60 + 4}" fill="#a855f7" font-size="10" font-family="monospace" text-anchor="end">${80 - i * 20}ms</text>
    `).join('')}

    <!-- Histogram bars -->
    ${histBars.map((bh, idx) => {
      const bx = idx * 33;
      const barHeight = (bh / 100) * 220;
      const by = 240 - barHeight;
      return `
        <rect x="${bx}" y="${by.toFixed(1)}" width="22" height="${barHeight.toFixed(1)}" rx="3" fill="${idx % 3 === 0 ? magenta : accent}" opacity="0.85" />
      `;
    }).join('')}
  </g>
</svg>`;
  }
};

import { templateCryptoMarket } from './templates_crypto';
import { templateCybersecurity } from './templates_cyber';
import { templateSocialGrowth } from './templates_social';
import { templateEcommerceSales } from './templates_ecom';
import { templateHealthFitness } from './templates_health';
import { templateSportsAnalytics } from './templates_sports';
import { templateWeatherClimate } from './templates_weather';
import { templateLogisticsSupply } from './templates_logistics';
import { templateEnergyGrid } from './templates_energy';
import { templateRealEstate } from './templates_realestate';

export const REMOTION_TEMPLATES: RemotionTemplate[] = [
  templateBusinessAnalytics,
  templateFinanceTrading,
  templateAiTech,
  templateCryptoMarket,
  templateCybersecurity,
  templateSocialGrowth,
  templateEcommerceSales,
  templateHealthFitness,
  templateSportsAnalytics,
  templateWeatherClimate,
  templateLogisticsSupply,
  templateEnergyGrid,
  templateRealEstate
];
