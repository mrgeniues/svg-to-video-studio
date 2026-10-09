import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 1. Crypto Market Dashboard
// ---------------------------------------------------------------------------
export const templateCryptoMarket: RemotionTemplate = {
  id: 'crypto-market',
  name: 'Crypto Market Dashboard',
  tagline: 'High-frequency crypto trading command with live candlesticks & order books',
  defaultTitle: 'GLOBAL CRYPTO INTELLIGENCE',
  defaultAccent: '#f7931a',
  presetAccents: ['#f7931a', '#10b981', '#6366f1', '#06b6d4', '#ec4899'],
  scenes: [
    'Hero coin price count-up with 24h change badge',
    'Candlestick chart building candle-by-candle across full duration',
    'Coin cards with mini sparklines & volume metrics',
    'Market-cap dominance donut with live % counter',
    'Volatility gauge with sweeping needle',
    'Order book bid/ask depth rows with real-time spread',
    'Blockchain network panel with traveling light pulses',
    'Fear & Greed index dial with calibrated gauge needle'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'GLOBAL CRYPTO INTELLIGENCE');
    const accent = opts.accent || '#f7931a';
    const green = '#10b981';
    const red = '#ef4444';
    const bg = '#0a0e17';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Pulses & cycles
    const pulsePhase = (p * 8) % 1;
    const livePulse = 0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2);

    // Hero coin price count-up (e.g. $64,250 -> $68,940)
    const priceEased = easeOutQuad(clamp(p / 0.4, 0, 1));
    const heroPrice = Math.round(64250 + (68940 - 64250) * priceEased);
    const heroPriceStr = heroPrice.toLocaleString('en-US');

    // Candlestick chart: 24 candles evenly building across full duration
    const totalCandles = 24;
    const candlesVisible = Math.min(totalCandles, Math.floor(p * totalCandles) + 1);
    const candleRng = createRng(42);
    const candleData: Array<{ open: number; close: number; high: number; low: number; isUp: boolean }> = [];
    let curP = 64200;
    for (let i = 0; i < totalCandles; i++) {
      const delta = (candleRng() - 0.46) * 600;
      const open = curP;
      const close = curP + delta;
      const high = Math.max(open, close) + candleRng() * 250;
      const low = Math.min(open, close) - candleRng() * 250;
      candleData.push({ open, close, high, low, isUp: close >= open });
      curP = close;
    }

    // Sparklines for 3 coin cards
    const sparkRng = createRng(99);
    const coinCards = [
      { name: 'BITCOIN', sym: 'BTC', price: '$68,940', change: '+5.42%', up: true, vol: '$34.2B' },
      { name: 'ETHEREUM', sym: 'ETH', price: '$3,520', change: '+4.18%', up: true, vol: '$18.7B' },
      { name: 'SOLANA', sym: 'SOL', price: '$184.50', change: '-1.85%', up: false, vol: '$6.9B' }
    ];

    // Market-cap dominance donut
    const btcDomTarget = 54.8;
    const btcDomCur = (btcDomTarget * clamp(p / 0.7, 0, 1)).toFixed(1);
    const donutCirc = 2 * Math.PI * 45;
    const donutDash = (donutCirc * (parseFloat(btcDomCur) / 100)).toFixed(1);

    // Volatility gauge needle (-60deg to +60deg)
    const gaugeAngle = -50 + 100 * easeOutQuad(p);

    // Order book rows: 6 asks (red) + 6 bids (green)
    const obRng = createRng(1234);
    const asks: Array<{ p: string; size: string; fill: number }> = [];
    const bids: Array<{ p: string; size: string; fill: number }> = [];
    for (let i = 0; i < 6; i++) {
      asks.push({
        p: (68950 + i * 15).toFixed(1),
        size: (0.4 + obRng() * 2.5).toFixed(3),
        fill: Math.round(20 + obRng() * 70)
      });
      bids.push({
        p: (68940 - i * 15).toFixed(1),
        size: (0.5 + obRng() * 2.8).toFixed(3),
        fill: Math.round(20 + obRng() * 70)
      });
    }

    // Blockchain network traveling pulses (4 links)
    const pulseTravel = (p * 4) % 1;

    // Fear & Greed index (e.g. 74 - Greed)
    const fgTarget = 74;
    const fgCur = Math.round(fgTarget * easeOutQuad(clamp(p / 0.6, 0, 1)));
    const fgAngle = -90 + (fgCur / 100) * 180;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-crypto" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Camera Drift Wrap -->
  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Grid lines -->
    <g opacity="0.05" stroke="#94a3b8" stroke-width="1">
      ${Array.from({ length: 19 }, (_, i) => `<line x1="${(i + 1) * 100}" y1="0" x2="${(i + 1) * 100}" y2="1080" />`).join('')}
      ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${(i + 1) * 90}" x2="1920" y2="${(i + 1) * 90}" />`).join('')}
    </g>

    <!-- Top Command Header -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" opacity="${livePulse.toFixed(2)}" filter="url(#glow-crypto)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">CRYPTO NODE LIVE</text>
    <text x="270" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <rect x="1560" y="47" width="130" height="30" rx="6" fill="#1b283f" />
    <text x="1625" y="67" fill="#10b981" font-size="12" font-family="monospace" font-weight="700" text-anchor="middle">GAS: 18 GWEI</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Hero Price Card (Top Left) -->
    <rect x="40" y="110" width="560" height="120" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <circle cx="75" cy="150" r="18" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-width="1.5" />
    <!-- Generic coin glyph -->
    <path d="M 68 142 L 75 137 L 82 142 L 82 158 L 75 163 L 68 158 Z" fill="none" stroke="${accent}" stroke-width="2" />
    <text x="105" y="144" fill="#94a3b8" font-size="11" font-weight="700" letter-spacing="1">BITCOIN / USD (PERP)</text>
    <text x="105" y="180" fill="#ffffff" font-size="36" font-weight="800" font-family="monospace">$${heroPriceStr}</text>
    <rect x="440" y="130" width="135" height="32" rx="6" fill="${green}" fill-opacity="0.15" stroke="${green}" stroke-opacity="0.4" stroke-width="1" />
    <text x="507" y="151" fill="${green}" font-size="14" font-weight="700" text-anchor="middle">+6.84% (24H)</text>
    <text x="440" y="188" fill="#64748b" font-size="11" font-family="monospace">VOL: $42.8B</text>

    <!-- 3 Coin Cards (Next to Hero) -->
    ${coinCards.map((coin, idx) => {
      const cardX = 620 + idx * 426;
      const cardStagger = clamp((p - idx * 0.08) / 0.3, 0, 1);
      const cardOpacity = 0.3 + 0.7 * cardStagger;
      const pts = Array.from({ length: 8 }, (_, pi) => {
        const px = 180 + pi * 16;
        const py = 75 - sparkRng() * 30;
        return `${px},${py.toFixed(1)}`;
      }).join(' ');

      return `
        <g transform="translate(${cardX}, 110)" opacity="${cardOpacity.toFixed(2)}">
          <rect x="0" y="0" width="406" height="120" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
          <circle cx="36" cy="40" r="14" fill="#1b283f" />
          <circle cx="36" cy="40" r="6" fill="${coin.up ? green : red}" />
          <text x="60" y="38" fill="#ffffff" font-size="13" font-weight="700">${coin.name}</text>
          <text x="60" y="52" fill="#64748b" font-size="10" font-family="monospace">${coin.sym}</text>
          <text x="36" y="94" fill="#ffffff" font-size="22" font-weight="800" font-family="monospace">${coin.price}</text>
          <rect x="290" y="24" width="95" height="24" rx="4" fill="${coin.up ? green : red}" fill-opacity="0.15" />
          <text x="337" y="40" fill="${coin.up ? green : red}" font-size="11" font-weight="700" text-anchor="middle">${coin.change}</text>
          <!-- Mini sparkline -->
          <polyline points="${pts}" fill="none" stroke="${coin.up ? green : red}" stroke-width="2" />
          <text x="290" y="94" fill="#64748b" font-size="10" font-family="monospace" text-anchor="start">24h Vol: ${coin.vol}</text>
        </g>
      `;
    }).join('')}

    <!-- Center Left: Candlestick Chart (Hero) -->
    <rect x="40" y="246" width="1080" height="420" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <text x="64" y="280" fill="#ffffff" font-size="15" font-weight="700">BTC/USD 15-MINUTE CANDLESTICKS</text>
    <text x="64" y="298" fill="#64748b" font-size="11">Candle-by-candle dynamic time accumulation</text>
    <rect x="940" y="264" width="160" height="26" rx="5" fill="#1b283f" />
    <text x="1020" y="281" fill="${accent}" font-size="11" font-family="monospace" font-weight="700" text-anchor="middle">${candlesVisible}/${totalCandles} CANDLES BUILT</text>

    <!-- Candlestick axes and candles -->
    <g transform="translate(64, 320)">
      <!-- Grid horizontals -->
      ${[0, 1, 2, 3, 4].map(i => `
        <line x1="0" y1="${i * 70}" x2="1020" y2="${i * 70}" stroke="#1b283f" stroke-width="1" stroke-dasharray="3 3" />
        <text x="1030" y="${i * 70 + 4}" fill="#64748b" font-size="10" font-family="monospace">$${(69500 - i * 400).toLocaleString()}</text>
      `).join('')}

      <!-- Candlesticks -->
      ${candleData.slice(0, candlesVisible).map((c, i) => {
        const cxPos = i * 42 + 20;
        const scaleP = (price: number) => 300 - ((price - 63500) / (70000 - 63500)) * 280;
        const openY = scaleP(c.open);
        const closeY = scaleP(c.close);
        const highY = scaleP(c.high);
        const lowY = scaleP(c.low);
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(3, Math.abs(closeY - openY));
        const color = c.isUp ? green : red;

        return `
          <g>
            <line x1="${cxPos}" y1="${highY.toFixed(1)}" x2="${cxPos}" y2="${lowY.toFixed(1)}" stroke="${color}" stroke-width="1.5" />
            <rect x="${cxPos - 12}" y="${bodyTop.toFixed(1)}" width="24" height="${bodyHeight.toFixed(1)}" rx="2" fill="${color}" opacity="0.9" />
          </g>
        `;
      }).join('')}
    </g>

    <!-- Center Right: Order Book Panel -->
    <rect x="1136" y="246" width="410" height="420" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <text x="1156" y="278" fill="#ffffff" font-size="14" font-weight="700">ORDER BOOK (L2 DEPTH)</text>
    <text x="1156" y="296" fill="#64748b" font-size="11">Real-time bids vs asks depth queue</text>

    <g transform="translate(1156, 310)">
      <!-- Asks (Red) -->
      ${asks.map((a, idx) => {
        const ay = idx * 22;
        return `
          <g>
            <rect x="0" y="${ay}" width="${Math.round(a.fill * 3.6)}" height="18" fill="${red}" fill-opacity="0.18" />
            <text x="4" y="${ay + 13}" fill="${red}" font-size="11" font-family="monospace" font-weight="700">${a.p}</text>
            <text x="350" y="${ay + 13}" fill="#cbd5e1" font-size="11" font-family="monospace" text-anchor="end">${a.size} BTC</text>
          </g>
        `;
      }).join('')}

      <!-- Spread divider -->
      <line x1="0" y1="140" x2="370" y2="140" stroke="#1b283f" stroke-width="1.5" />
      <text x="185" y="152" fill="${accent}" font-size="11" font-family="monospace" font-weight="700" text-anchor="middle">SPREAD: $1.20 (0.002%)</text>
      <line x1="0" y1="158" x2="370" y2="158" stroke="#1b283f" stroke-width="1.5" />

      <!-- Bids (Green) -->
      ${bids.map((b, idx) => {
        const by = 168 + idx * 22;
        return `
          <g>
            <rect x="0" y="${by}" width="${Math.round(b.fill * 3.6)}" height="18" fill="${green}" fill-opacity="0.18" />
            <text x="4" y="${by + 13}" fill="${green}" font-size="11" font-family="monospace" font-weight="700">${b.p}</text>
            <text x="350" y="${by + 13}" fill="#cbd5e1" font-size="11" font-family="monospace" text-anchor="end">${b.size} BTC</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Far Right: Market Dominance and Fear/Greed -->
    <rect x="1562" y="246" width="318" height="420" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <text x="1582" y="278" fill="#ffffff" font-size="14" font-weight="700">MARKET METRICS</text>

    <!-- Dominance Donut -->
    <g transform="translate(1721, 370)">
      <circle cx="0" cy="0" r="45" fill="none" stroke="#1b283f" stroke-width="14" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="${accent}" stroke-width="14" stroke-dasharray="${donutCirc.toFixed(1)}" stroke-dashoffset="${(donutCirc - parseFloat(donutDash)).toFixed(1)}" transform="rotate(-90)" />
      <text x="0" y="5" fill="#ffffff" font-size="15" font-weight="800" font-family="monospace" text-anchor="middle">${btcDomCur}%</text>
      <text x="0" y="65" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">BTC DOMINANCE</text>
    </g>

    <!-- Fear and Greed Gauge -->
    <g transform="translate(1721, 540)">
      <path d="M -50 0 A 50 50 0 0 1 50 0" fill="none" stroke="#1b283f" stroke-width="10" />
      <path d="M -50 0 A 50 50 0 0 1 50 0" fill="none" stroke="${green}" stroke-width="10" stroke-dasharray="157" stroke-dashoffset="${(157 * (1 - fgCur / 100)).toFixed(1)}" />
      <!-- Needle -->
      <line x1="0" y1="0" x2="0" y2="-40" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" transform="rotate(${fgAngle.toFixed(1)})" />
      <circle cx="0" cy="0" r="5" fill="${accent}" />
      <text x="0" y="22" fill="#ffffff" font-size="18" font-weight="800" font-family="monospace" text-anchor="middle">${fgCur}</text>
      <text x="0" y="38" fill="${green}" font-size="10" font-weight="700" letter-spacing="1" text-anchor="middle">GREED INDEX</text>
    </g>

    <!-- Bottom Left: Blockchain Network Link Pulses -->
    <rect x="40" y="682" width="700" height="358" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <text x="64" y="714" fill="#ffffff" font-size="14" font-weight="700">GLOBAL CONSENSUS NODES</text>
    <text x="64" y="732" fill="#64748b" font-size="11">Real-time peer gossip propagation &amp; validation</text>

    <!-- 4 Nodes with interconnecting arcs -->
    <g transform="translate(64, 750)">
      <!-- Links -->
      <line x1="80" y1="120" x2="260" y2="40" stroke="#1b283f" stroke-width="2" />
      <line x1="260" y1="40" x2="440" y2="120" stroke="#1b283f" stroke-width="2" />
      <line x1="440" y1="120" x2="260" y2="200" stroke="#1b283f" stroke-width="2" />
      <line x1="260" y1="200" x2="80" y2="120" stroke="#1b283f" stroke-width="2" />
      <line x1="80" y1="120" x2="440" y2="120" stroke="#1b283f" stroke-width="1.5" stroke-dasharray="4 4" />

      <!-- Traveling pulses -->
      <circle cx="${(80 + (260 - 80) * pulseTravel).toFixed(1)}" cy="${(120 + (40 - 120) * pulseTravel).toFixed(1)}" r="4" fill="${accent}" filter="url(#glow-crypto)" />
      <circle cx="${(260 + (440 - 260) * pulseTravel).toFixed(1)}" cy="${(40 + (120 - 40) * pulseTravel).toFixed(1)}" r="4" fill="${green}" filter="url(#glow-crypto)" />
      <circle cx="${(440 + (260 - 440) * pulseTravel).toFixed(1)}" cy="${(120 + (200 - 120) * pulseTravel).toFixed(1)}" r="4" fill="${accent}" filter="url(#glow-crypto)" />
      <circle cx="${(260 + (80 - 260) * pulseTravel).toFixed(1)}" cy="${(200 + (120 - 200) * pulseTravel).toFixed(1)}" r="4" fill="${green}" filter="url(#glow-crypto)" />

      <!-- Node Circles -->
      <circle cx="80" cy="120" r="24" fill="#1b283f" stroke="${accent}" stroke-width="2" />
      <text x="80" y="125" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">US-E</text>

      <circle cx="260" cy="40" r="24" fill="#1b283f" stroke="${green}" stroke-width="2" />
      <text x="260" y="45" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">EU-C</text>

      <circle cx="440" cy="120" r="24" fill="#1b283f" stroke="${accent}" stroke-width="2" />
      <text x="440" y="125" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">AP-S</text>

      <circle cx="260" cy="200" r="24" fill="#1b283f" stroke="${green}" stroke-width="2" />
      <text x="260" y="205" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">SA-E</text>

      <text x="560" y="100" fill="#94a3b8" font-size="11">LATENCY: 12ms</text>
      <text x="560" y="125" fill="#10b981" font-size="11" font-weight="700">PEERS: 1,482</text>
      <text x="560" y="150" fill="#94a3b8" font-size="11">SYNC: 100%</text>
    </g>

    <!-- Bottom Middle: Volatility Gauge -->
    <rect x="756" y="682" width="530" height="358" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <text x="780" y="714" fill="#ffffff" font-size="14" font-weight="700">IMPLIED VOLATILITY (DVOL)</text>
    <text x="780" y="732" fill="#64748b" font-size="11">Annualized 30-day option implied volatility</text>

    <g transform="translate(1021, 860)">
      <!-- Arc -->
      <path d="M -110 0 A 110 110 0 0 1 110 0" fill="none" stroke="#1b283f" stroke-width="16" />
      <path d="M -110 0 A 110 110 0 0 1 110 0" fill="none" stroke="${accent}" stroke-width="16" stroke-dasharray="345" stroke-dashoffset="${(345 * (1 - (gaugeAngle + 60) / 120)).toFixed(1)}" />
      <!-- Needle -->
      <line x1="0" y1="0" x2="0" y2="-90" stroke="#ffffff" stroke-width="3" stroke-linecap="round" transform="rotate(${gaugeAngle.toFixed(1)})" />
      <circle cx="0" cy="0" r="8" fill="${accent}" />
      <text x="0" y="30" fill="#ffffff" font-size="28" font-weight="800" font-family="monospace" text-anchor="middle">${(52 + (gaugeAngle + 50) * 0.25).toFixed(1)}%</text>
      <text x="0" y="48" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">ANNUALIZED SIGMA</text>
    </g>

    <!-- Bottom Right: Live Mining and Liquidation Ticker -->
    <rect x="1302" y="682" width="578" height="358" rx="10" fill="#0d1424" stroke="#1b283f" stroke-width="1.5" />
    <text x="1326" y="714" fill="#ffffff" font-size="14" font-weight="700">RECENT LIQUIDATIONS &amp; BLOCKS</text>
    <text x="1326" y="732" fill="#64748b" font-size="11">Real-time mempool transactions &amp; margin calls</text>

    <g transform="translate(1326, 755)">
      ${[
        { t: '14:22:01', tag: 'SHORT LIQ', coin: 'BTC/USD', amt: '$420,800', isLiq: true },
        { t: '14:21:58', tag: 'NEW BLOCK', coin: '#842,912', amt: '3.14 BTC', isLiq: false },
        { t: '14:21:49', tag: 'LONG LIQ', coin: 'ETH/USD', amt: '$124,500', isLiq: true },
        { t: '14:21:35', tag: 'WHALE BUY', coin: 'SOL/USD', amt: '$1,850,000', isLiq: false },
        { t: '14:21:12', tag: 'SHORT LIQ', coin: 'BTC/USD', amt: '$890,200', isLiq: true }
      ].map((row, idx) => {
        const ry = idx * 46;
        const rowStagger = clamp((p - idx * 0.1) / 0.2, 0, 1);
        return `
          <g transform="translate(0, ${ry})" opacity="${(0.2 + 0.8 * rowStagger).toFixed(2)}">
            <rect x="0" y="0" width="530" height="38" rx="6" fill="#111a2e" stroke="#1b283f" stroke-width="1" />
            <text x="12" y="24" fill="#64748b" font-size="11" font-family="monospace">${row.t}</text>
            <rect x="90" y="8" width="95" height="22" rx="4" fill="${row.isLiq ? red : green}" fill-opacity="0.18" />
            <text x="137" y="23" fill="${row.isLiq ? red : green}" font-size="10" font-weight="700" text-anchor="middle">${row.tag}</text>
            <text x="220" y="24" fill="#cbd5e1" font-size="12" font-weight="600">${row.coin}</text>
            <text x="510" y="24" fill="#ffffff" font-size="13" font-family="monospace" font-weight="700" text-anchor="end">${row.amt}</text>
          </g>
        `;
      }).join('')}
    </g>
  </g>
</svg>`;
  }
};
