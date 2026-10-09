import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 4. E-Commerce Sales Dashboard
// ---------------------------------------------------------------------------
export const templateEcommerceSales: RemotionTemplate = {
  id: 'ecommerce-sales',
  name: 'E-Commerce Sales Dashboard',
  tagline: 'Dark slate conversion engine with live revenue, funnel & stock bars',
  defaultTitle: 'GLOBAL STORE PERFORMANCE',
  defaultAccent: '#00d68f',
  presetAccents: ['#00d68f', '#ffd60a', '#3b82f6', '#ec4899', '#f97316'],
  scenes: [
    'Revenue counter with delta badge & transaction volume',
    'Sales line chart with smooth area fill drawing dynamically',
    'Product cards with depleting real-time stock bars',
    'Conversion funnel filling top-down stage by stage',
    'Orders table with status pills (PAID/SHIPPED/PENDING)',
    'Top-products horizontal bar chart growing to scale',
    'Live orders ticker tape scrolling continuously',
    'Cart abandonment gauge with sweeping needle'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'GLOBAL STORE PERFORMANCE');
    const accent = opts.accent || '#00d68f';
    const gold = '#ffd60a';
    const bg = '#0b0f19';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Revenue counter: $248,500 -> $394,280
    const revVal = Math.round(248500 + (394280 - 248500) * easeOutQuad(p)).toLocaleString('en-US');

    // Funnel stages (Visitors -> Views -> Cart -> Checkout -> Paid)
    const funnelStages = [
      { name: 'SITE VISITORS', count: '142,500', pct: 100, w: 480 },
      { name: 'PRODUCT VIEWS', count: '89,200', pct: 62.5, w: 380 },
      { name: 'ADD TO CART', count: '28,400', pct: 19.9, w: 260 },
      { name: 'INIT CHECKOUT', count: '14,800', pct: 10.3, w: 180 },
      { name: 'COMPLETED SALES', count: '9,420', pct: 6.6, w: 120 }
    ];

    // Orders table
    const orders = [
      { id: '#ORD-8812', item: 'Wireless Studio ANC Headphones', customer: 'Sarah K.', amt: '$349.00', status: 'PAID', col: accent },
      { id: '#ORD-8811', item: 'Mechanical RGB Keyboard Pro', customer: 'David M.', amt: '$189.50', status: 'SHIPPED', col: '#3b82f6' },
      { id: '#ORD-8810', item: 'Ergonomic Desk Mat (Leather)', customer: 'Elena R.', amt: '$59.00', status: 'PAID', col: accent },
      { id: '#ORD-8809', item: 'Ultra-Wide 4K Gaming Monitor', customer: 'Alex T.', amt: '$799.00', status: 'PENDING', col: gold },
      { id: '#ORD-8808', item: 'Studio Boom Mic Arm V2', customer: 'Liam W.', amt: '$129.00', status: 'PAID', col: accent }
    ];

    // Cart abandonment needle (68% -> 62%)
    const abandonAngle = -45 + 90 * (0.68 - 0.06 * easeOutQuad(p));

    // Area chart line drawing
    const chartLenEst = 1000;
    const dashOffset = chartLenEst * (1 - easeOutQuad(p));

    // Top products growing bars
    const topProds = [
      { name: 'ANC Headphones Pro', rev: '$124.5K', fill: 85 },
      { name: 'Desk Ergonomics Set', rev: '$94.2K', fill: 68 },
      { name: 'Mechanical Keyboards', rev: '$78.0K', fill: 54 },
      { name: '4K Display Adapters', rev: '$46.8K', fill: 36 }
    ];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-ecom" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Header -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#131b2e" stroke="#1f2c4a" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-ecom)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">STORE ANALYTICS</text>
    <text x="250" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Left: Hero Revenue Card -->
    <rect x="40" y="110" width="560" height="130" rx="10" fill="#131b2e" stroke="#1f2c4a" stroke-width="1.5" />
    <text x="64" y="140" fill="#94a3b8" font-size="11" font-weight="700" letter-spacing="1">TODAY'S GROSS SALES</text>
    <text x="64" y="185" fill="#ffffff" font-size="40" font-weight="900" font-family="monospace">$${revVal}</text>
    <rect x="430" y="135" width="150" height="30" rx="6" fill="${accent}" fill-opacity="0.15" />
    <text x="505" y="155" fill="${accent}" font-size="13" font-weight="800" text-anchor="middle">+32.4% vs YDAY</text>
    <text x="64" y="215" fill="#64748b" font-size="11">AVERAGE ORDER VALUE: $142.80 • 2,760 ORDERS</text>

    <!-- Top 3 Metric Cards (Conversion, AOV, Returns) -->
    ${[
      { label: 'CONVERSION RATE', val: '4.82%', sub: '+0.6% this week', col: accent },
      { label: 'ACTIVE CHECKOUTS', val: '184', sub: '32 in payment flow', col: gold },
      { label: 'RETURN RATE', val: '1.14%', sub: '-0.3% low return', col: '#3b82f6' }
    ].map((card, idx) => {
      const cxPos = 620 + idx * 426;
      return `
        <g transform="translate(${cxPos}, 110)">
          <rect x="0" y="0" width="406" height="130" rx="10" fill="#131b2e" stroke="#1f2c4a" stroke-width="1.5" />
          <text x="24" y="36" fill="#94a3b8" font-size="11" font-weight="700">${card.label}</text>
          <text x="24" y="80" fill="#ffffff" font-size="32" font-weight="900" font-family="monospace">${card.val}</text>
          <text x="24" y="106" fill="${card.col}" font-size="11" font-weight="600">${card.sub}</text>
        </g>
      `;
    }).join('')}

    <!-- Center Left: Sales Area Chart -->
    <rect x="40" y="260" width="1080" height="390" rx="10" fill="#131b2e" stroke="#1f2c4a" stroke-width="1.5" />
    <text x="64" y="294" fill="#ffffff" font-size="15" font-weight="800">HOURLY SALES VELOCITY</text>
    <text x="64" y="312" fill="#64748b" font-size="11">Real-time GMV accumulation across store channels</text>

    <g transform="translate(64, 340)">
      ${[0, 1, 2, 3].map(i => `
        <line x1="0" y1="${i * 70}" x2="1020" y2="${i * 70}" stroke="#1f2c4a" stroke-width="1" stroke-dasharray="3 3" />
        <text x="1030" y="${i * 70 + 4}" fill="#64748b" font-size="10" font-family="monospace">$${40 - i * 10}K</text>
      `).join('')}

      <path d="M 0 210 Q 250 180 500 80 T 1000 20" fill="none" stroke="${accent}" stroke-width="3.5" stroke-dasharray="${chartLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" filter="url(#glow-ecom)" />
    </g>

    <!-- Center Right: Conversion Funnel -->
    <rect x="1140" y="260" width="740" height="390" rx="10" fill="#131b2e" stroke="#1f2c4a" stroke-width="1.5" />
    <text x="1164" y="294" fill="#ffffff" font-size="15" font-weight="800">ECOMMERCE CONVERSION FUNNEL</text>
    <text x="1164" y="312" fill="#64748b" font-size="11">Stage-by-stage checkout progression flow</text>

    <g transform="translate(1164, 340)">
      ${funnelStages.map((stage, idx) => {
        const fy = idx * 56;
        const stageStagger = clamp((p - idx * 0.12) / 0.25, 0, 1);
        const stageW = stage.w * easeOutQuad(stageStagger);
        return `
          <g transform="translate(0, ${fy})" opacity="${(0.3 + 0.7 * stageStagger).toFixed(2)}">
            <text x="0" y="16" fill="#cbd5e1" font-size="11" font-weight="700">${stage.name}</text>
            <text x="690" y="16" fill="${accent}" font-size="12" font-family="monospace" font-weight="800" text-anchor="end">${stage.count} (${stage.pct}%)</text>
            <rect x="0" y="24" width="690" height="14" rx="4" fill="#1f2c4a" />
            <rect x="0" y="24" width="${stageW.toFixed(1)}" height="14" rx="4" fill="${accent}" />
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Left: Recent Orders Table -->
    <rect x="40" y="670" width="1080" height="370" rx="10" fill="#131b2e" stroke="#1f2c4a" stroke-width="1.5" />
    <text x="64" y="704" fill="#ffffff" font-size="14" font-weight="800">STREAMING ORDERS STREAM</text>
    <text x="64" y="722" fill="#64748b" font-size="11">Real-time payment gateway transactions</text>

    <g transform="translate(64, 740)">
      ${orders.map((ord, idx) => {
        const oy = idx * 52;
        const oStagger = clamp((p - idx * 0.08) / 0.2, 0, 1);
        return `
          <g transform="translate(0, ${oy})" opacity="${(0.2 + 0.8 * oStagger).toFixed(2)}">
            <rect x="0" y="0" width="1030" height="42" rx="6" fill="#101726" stroke="#1f2c4a" stroke-width="1" />
            <text x="16" y="26" fill="#64748b" font-size="11" font-family="monospace">${ord.id}</text>
            <text x="120" y="26" fill="#ffffff" font-size="12" font-weight="700">${ord.item}</text>
            <text x="560" y="26" fill="#94a3b8" font-size="12">${ord.customer}</text>
            <text x="820" y="26" fill="#ffffff" font-size="13" font-family="monospace" font-weight="800">${ord.amt}</text>
            <rect x="910" y="10" width="95" height="22" rx="4" fill="${ord.col}" fill-opacity="0.2" />
            <text x="957" y="25" fill="${ord.col}" font-size="10" font-weight="800" text-anchor="middle">${ord.status}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Right: Top Products and Cart Gauge -->
    <rect x="1140" y="670" width="740" height="370" rx="10" fill="#131b2e" stroke="#1f2c4a" stroke-width="1.5" />
    <text x="1164" y="704" fill="#ffffff" font-size="14" font-weight="800">TOP PRODUCTS &amp; CART ABANDONMENT</text>

    <!-- Top Products Bars -->
    <g transform="translate(1164, 730)">
      ${topProds.map((prod, idx) => {
        const py = idx * 44;
        const bW = Math.max(10, prod.fill * 4.2 * easeOutQuad(p));
        return `
          <g transform="translate(0, ${py})">
            <text x="0" y="14" fill="#cbd5e1" font-size="11" font-weight="700">${prod.name}</text>
            <text x="440" y="14" fill="${accent}" font-size="11" font-family="monospace" font-weight="800" text-anchor="end">${prod.rev}</text>
            <rect x="0" y="22" width="440" height="10" rx="3" fill="#1f2c4a" />
            <rect x="0" y="22" width="${bW.toFixed(1)}" height="10" rx="3" fill="${accent}" />
          </g>
        `;
      }).join('')}
    </g>

    <!-- Cart Abandonment Gauge (Right of bars) -->
    <g transform="translate(1730, 840)">
      <path d="M -60 0 A 60 60 0 0 1 60 0" fill="none" stroke="#1f2c4a" stroke-width="12" />
      <path d="M -60 0 A 60 60 0 0 1 60 0" fill="none" stroke="${gold}" stroke-width="12" stroke-dasharray="188" stroke-dashoffset="65" />
      <line x1="0" y1="0" x2="0" y2="-45" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" transform="rotate(${abandonAngle.toFixed(1)})" />
      <circle cx="0" cy="0" r="5" fill="${gold}" />
      <text x="0" y="24" fill="#ffffff" font-size="20" font-weight="800" font-family="monospace" text-anchor="middle">62.4%</text>
      <text x="0" y="42" fill="#94a3b8" font-size="10" font-weight="700" text-anchor="middle">ABANDON RATE</text>
    </g>
  </g>
</svg>`;
  }
};
