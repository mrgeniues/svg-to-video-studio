import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 10. Real Estate Market Dashboard
// ---------------------------------------------------------------------------
export const templateRealEstate: RemotionTemplate = {
  id: 'real-estate-market',
  name: 'Real Estate Market',
  tagline: 'Midnight navy luxury property intelligence with median price trends & heatmap',
  defaultTitle: 'METROPOLITAN PROPERTY INDEX',
  defaultAccent: '#d4af37',
  presetAccents: ['#d4af37', '#10b981', '#3b82f6', '#ec4899', '#f59e0b'],
  scenes: [
    'Median price trend line with area fill drawing smoothly',
    'Property cards (generic house glyphs) with live price count-up',
    'Mortgage rate comparison bars across 15yr and 30yr terms',
    'Listings table with animated NEW status badges sliding in',
    'Neighborhood price heatmap grid lighting up micro-markets',
    'ROI buy-vs-rent donut with dynamic equity growth ratios',
    'Interest rate benchmark gauge with calibrated needle',
    'New luxury listings ticker tape scrolling continuously'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'METROPOLITAN PROPERTY INDEX');
    const accent = opts.accent || '#d4af37';
    const green = '#10b981';
    const bg = '#070b14';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Median price count-up: $845,000 -> $920,000
    const medianPrice = Math.round(845000 + (920000 - 845000) * easeOutQuad(p)).toLocaleString('en-US');

    // Interest rate needle (6.8% -> 6.4%)
    const rateAngle = -20 + 40 * easeOutQuad(p);

    // Buy vs Rent donut (Equity 68%)
    const equityPct = (68.4 * easeOutQuad(clamp(p / 0.7, 0, 1))).toFixed(1);
    const donutCirc = 2 * Math.PI * 45;
    const donutDash = (donutCirc * (parseFloat(equityPct) / 100)).toFixed(1);

    // Listings table
    const listings = [
      { id: 'PROP-402', title: 'Bel-Air Skyline Penthouse', sqft: '4,850 SQFT', price: '$4,250,000', badge: 'NEW', col: accent },
      { id: 'PROP-401', title: 'Tribeca Architectural Loft', sqft: '3,200 SQFT', price: '$3,100,000', badge: 'NEW', col: accent },
      { id: 'PROP-400', title: 'Silicon Valley Modern Estate', sqft: '6,100 SQFT', price: '$5,800,000', badge: 'ACTIVE', col: green },
      { id: 'PROP-399', title: 'Waterfront Marina Residence', sqft: '2,900 SQFT', price: '$2,450,000', badge: 'ACTIVE', col: green },
      { id: 'PROP-398', title: 'Historic Brownstone Manor', sqft: '4,100 SQFT', price: '$3,890,000', badge: 'PENDING', col: '#cbd5e1' }
    ];

    // Chart path line drawing
    const chartLenEst = 1000;
    const dashOffset = chartLenEst * (1 - easeOutQuad(p));

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-re" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Header -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#0d1424" stroke="#18233c" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-re)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">LUXURY RESIDENTIAL DESK</text>
    <text x="310" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Left: Hero Median Price Card -->
    <rect x="40" y="110" width="560" height="130" rx="10" fill="#0d1424" stroke="#18233c" stroke-width="1.5" />
    <text x="64" y="140" fill="#94a3b8" font-size="11" font-weight="700">MEDIAN HOME VALUE (METRO)</text>
    <text x="64" y="185" fill="#ffffff" font-size="40" font-weight="900" font-family="monospace">$${medianPrice}</text>
    <rect x="430" y="135" width="150" height="30" rx="6" fill="${green}" fill-opacity="0.15" />
    <text x="505" y="155" fill="${green}" font-size="13" font-weight="800" text-anchor="middle">+8.8% YOY</text>
    <text x="64" y="215" fill="#64748b" font-size="11">PRICE / SQFT: $642 • AVG DAYS ON MARKET: 19</text>

    <!-- Top 3 Metric Cards (Inventory, Mortgage Rate, Sales Volume) -->
    ${[
      { label: '30-YEAR FIXED MORTGAGE', val: '6.42%', sub: '-24 BPS THIS MONTH', col: green },
      { label: 'ACTIVE INVENTORY', val: '1,420 UNITS', sub: '+12% NEW SUPPLY', col: accent },
      { label: 'BUYER DEMAND INDEX', val: '124.6', sub: 'STRONG SELLER MARKET', col: '#3b82f6' }
    ].map((card, idx) => {
      const cxPos = 620 + idx * 426;
      return `
        <g transform="translate(${cxPos}, 110)">
          <rect x="0" y="0" width="406" height="130" rx="10" fill="#0d1424" stroke="#18233c" stroke-width="1.5" />
          <text x="24" y="36" fill="#94a3b8" font-size="11" font-weight="700">${card.label}</text>
          <text x="24" y="80" fill="#ffffff" font-size="30" font-weight="900" font-family="monospace">${card.val}</text>
          <text x="24" y="106" fill="${card.col}" font-size="11" font-weight="700">${card.sub}</text>
        </g>
      `;
    }).join('')}

    <!-- Center Left: Price Trend Area Chart -->
    <rect x="40" y="260" width="1080" height="390" rx="10" fill="#0d1424" stroke="#18233c" stroke-width="1.5" />
    <text x="64" y="294" fill="#ffffff" font-size="15" font-weight="800">5-YEAR HISTORICAL APPRECIATION</text>
    <text x="64" y="312" fill="#64748b" font-size="11">Compounded annual growth rate (CAGR) across prime zip codes</text>

    <g transform="translate(64, 340)">
      ${[0, 1, 2, 3].map(i => `
        <line x1="0" y1="${i * 70}" x2="1020" y2="${i * 70}" stroke="#18233c" stroke-width="1" stroke-dasharray="3 3" />
        <text x="1030" y="${i * 70 + 4}" fill="#64748b" font-size="10" font-family="monospace">$${1000 - i * 100}K</text>
      `).join('')}

      <path d="M 0 210 Q 250 180 500 110 T 1000 40" fill="none" stroke="${accent}" stroke-width="3.5" stroke-dasharray="${chartLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" filter="url(#glow-re)" />
    </g>

    <!-- Center Right: Neighborhood Heatmap Grid -->
    <rect x="1140" y="260" width="740" height="390" rx="10" fill="#0d1424" stroke="#18233c" stroke-width="1.5" />
    <text x="1164" y="294" fill="#ffffff" font-size="15" font-weight="800">NEIGHBORHOOD VALUATION HEATMAP</text>

    <g transform="translate(1164, 330)">
      ${[
        { name: 'DOWNTOWN SKYLINE', sqft: '$890/sqft', fill: accent, val: '+14%' },
        { name: 'WATERFRONT DISTRICT', sqft: '$1,120/sqft', fill: accent, val: '+18%' },
        { name: 'NORTH HILLS SUBURBS', sqft: '$540/sqft', fill: green, val: '+9%' },
        { name: 'TECH CORRIDOR WEST', sqft: '$780/sqft', fill: green, val: '+12%' }
      ].map((hood, idx) => {
        const hy = idx * 68;
        return `
          <g transform="translate(0, ${hy})">
            <rect x="0" y="0" width="690" height="54" rx="8" fill="#111a2e" stroke="#18233c" stroke-width="1" />
            <text x="20" y="32" fill="#ffffff" font-size="13" font-weight="700">${hood.name}</text>
            <text x="380" y="32" fill="#94a3b8" font-size="12" font-family="monospace">${hood.sqft}</text>
            <rect x="580" y="14" width="90" height="26" rx="4" fill="${hood.fill}" fill-opacity="0.2" />
            <text x="625" y="31" fill="${hood.fill}" font-size="12" font-weight="800" text-anchor="middle">${hood.val}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Left: Featured Luxury Listings Table -->
    <rect x="40" y="670" width="1080" height="370" rx="10" fill="#0d1424" stroke="#18233c" stroke-width="1.5" />
    <text x="64" y="704" fill="#ffffff" font-size="14" font-weight="800">PREMIER EXCLUSIVE PORTFOLIO</text>

    <g transform="translate(64, 735)">
      ${listings.map((item, idx) => {
        const ly = idx * 54;
        return `
          <g transform="translate(0, ${ly})">
            <rect x="0" y="0" width="1030" height="44" rx="6" fill="#0a0f1c" stroke="#18233c" stroke-width="1" />
            <!-- Generic house icon -->
            <path d="M 24 24 L 32 16 L 40 24 V 32 H 24 Z" fill="none" stroke="${accent}" stroke-width="1.5" />
            <text x="56" y="27" fill="#ffffff" font-size="13" font-weight="700">${item.title}</text>
            <text x="500" y="27" fill="#94a3b8" font-size="12" font-family="monospace">${item.sqft}</text>
            <text x="760" y="27" fill="#ffffff" font-size="14" font-family="monospace" font-weight="900">${item.price}</text>
            <rect x="910" y="11" width="95" height="22" rx="4" fill="${item.col}" fill-opacity="0.15" />
            <text x="957" y="26" fill="${item.col}" font-size="10" font-weight="800" text-anchor="middle">${item.badge}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Right: ROI Buy-vs-Rent Donut -->
    <rect x="1140" y="670" width="740" height="370" rx="10" fill="#0d1424" stroke="#18233c" stroke-width="1.5" />
    <text x="1164" y="704" fill="#ffffff" font-size="14" font-weight="800">BUY VS RENT EQUITY BUILDUP</text>

    <g transform="translate(1500, 840)">
      <circle cx="0" cy="0" r="45" fill="none" stroke="#18233c" stroke-width="14" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="${accent}" stroke-width="14" stroke-dasharray="${donutCirc.toFixed(1)}" stroke-dashoffset="${(donutCirc - parseFloat(donutDash)).toFixed(1)}" transform="rotate(-90)" />
      <text x="0" y="6" fill="#ffffff" font-size="16" font-weight="900" font-family="monospace" text-anchor="middle">${equityPct}%</text>
      <text x="0" y="68" fill="#cbd5e1" font-size="11" font-weight="700" text-anchor="middle">EQUITY RETURN RATIO</text>
    </g>
  </g>
</svg>`;
  }
};
