import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 8. Logistics / Supply Chain Dashboard
// ---------------------------------------------------------------------------
export const templateLogisticsSupply: RemotionTemplate = {
  id: 'logistics-supply',
  name: 'Logistics / Supply Chain',
  tagline: 'Dark indigo freight operations command with shipping arcs & fleet status',
  defaultTitle: 'GLOBAL FREIGHT AND FLEET LOGISTICS',
  defaultAccent: '#ff7a1a',
  presetAccents: ['#ff7a1a', '#10b981', '#3b82f6', '#ffd60a', '#a855f7'],
  scenes: [
    'World map with shipping routes (dashed arcs) & traveling cargo pulses',
    'Shipment status cards with real-time transit progress bars',
    'Warehouse inventory capacity bars with fill percentages',
    'Fleet table with status pills (EN ROUTE / DELAYED / DELIVERED)',
    'On-time delivery donut chart with dynamic target tracking',
    'Delivery route timeline with checkpoint dots filling in order',
    'Container volume counters by global port counting up',
    'Live container manifest ticker tape streaming continuously'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'GLOBAL FREIGHT & FLEET LOGISTICS');
    const accent = opts.accent || '#ff7a1a';
    const green = '#10b981';
    const bg = '#090a14';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Pulse along shipping arcs
    const cargoPulse = (p * 4) % 1;

    // Active shipments counter count-up
    const activeShipments = Math.round(18400 + 4200 * easeOutQuad(p)).toLocaleString('en-US');

    // On-time delivery rate
    const onTimeTarget = 96.4;
    const onTimeCur = (onTimeTarget * easeOutQuad(clamp(p / 0.7, 0, 1))).toFixed(1);
    const donutCirc = 2 * Math.PI * 45;
    const donutDash = (donutCirc * (parseFloat(onTimeCur) / 100)).toFixed(1);

    // Fleet shipments table
    const fleet = [
      { id: 'SHP-9921', origin: 'ROTTERDAM', dest: 'SINGAPORE', mode: 'OCEAN VESSEL', status: 'EN ROUTE', col: green },
      { id: 'SHP-9920', origin: 'SHANGHAI', dest: 'LOS ANGELES', mode: 'AIR CARGO', status: 'EN ROUTE', col: green },
      { id: 'SHP-9919', origin: 'HAMBURG', dest: 'NEW YORK', mode: 'OCEAN VESSEL', status: 'DELAYED', col: '#ef4444' },
      { id: 'SHP-9918', origin: 'TOKYO', dest: 'DUBAI', mode: 'AIR EXPRESS', status: 'DELIVERED', col: accent },
      { id: 'SHP-9917', origin: 'CHICAGO', dest: 'LONDON', mode: 'INTERMODAL', status: 'EN ROUTE', col: green }
    ];

    // Shipping route arcs
    const routes = [
      { x1: 200, y1: 220, x2: 480, y2: 180 },
      { x1: 480, y1: 180, x2: 850, y2: 260 },
      { x1: 850, y1: 260, x2: 300, y2: 320 }
    ];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-logistics" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Top Command Header -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#111326" stroke="#1d2242" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-logistics)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">CARGO TELEMETRY ACTIVE</text>
    <text x="310" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Left: Hero In-Transit Card -->
    <rect x="40" y="110" width="560" height="130" rx="10" fill="#111326" stroke="#1d2242" stroke-width="1.5" />
    <text x="64" y="140" fill="#94a3b8" font-size="11" font-weight="700">ACTIVE GLOBAL SHIPMENTS</text>
    <text x="64" y="185" fill="#ffffff" font-size="40" font-weight="900" font-family="monospace">${activeShipments}</text>
    <rect x="420" y="135" width="160" height="30" rx="6" fill="${green}" fill-opacity="0.15" />
    <text x="500" y="155" fill="${green}" font-size="12" font-weight="800" text-anchor="middle">98.2% TRANSIT FLOW</text>
    <text x="64" y="215" fill="#64748b" font-size="11">AVERAGE DWELL TIME: 4.2 HRS • FLEET CAPACITY 89%</text>

    <!-- 3 Port Hub Cards -->
    ${[
      { port: 'PORT OF SINGAPORE', teus: '142,800 TEU', load: '92%', col: accent },
      { port: 'PORT OF ROTTERDAM', teus: '98,400 TEU', load: '84%', col: green },
      { port: 'PORT OF LOS ANGELES', teus: '115,200 TEU', load: '88%', col: '#3b82f6' }
    ].map((h, idx) => {
      const hx = 620 + idx * 426;
      return `
        <g transform="translate(${hx}, 110)">
          <rect x="0" y="0" width="406" height="130" rx="10" fill="#111326" stroke="#1d2242" stroke-width="1.5" />
          <text x="24" y="36" fill="#94a3b8" font-size="11" font-weight="700">${h.port}</text>
          <text x="24" y="80" fill="#ffffff" font-size="28" font-weight="900" font-family="monospace">${h.teus}</text>
          <rect x="24" y="96" width="358" height="8" rx="4" fill="#1d2242" />
          <rect x="24" y="96" width="${(358 * (parseInt(h.load) / 100)).toFixed(1)}" height="8" rx="4" fill="${h.col}" />
        </g>
      `;
    }).join('')}

    <!-- Center Left: Global Shipping Routes Map -->
    <rect x="40" y="260" width="1080" height="400" rx="10" fill="#111326" stroke="#1d2242" stroke-width="1.5" />
    <text x="64" y="294" fill="#ffffff" font-size="15" font-weight="800">GLOBAL INTERMODAL MARITIME CORRIDORS</text>
    <text x="64" y="312" fill="#64748b" font-size="11">Real-time AIS satellite vessel positioning &amp; sea lanes</text>

    <g transform="translate(64, 330)">
      <!-- Arcs and traveling cargo packets -->
      ${routes.map((rt, i) => {
        const mx = (rt.x1 + rt.x2) / 2;
        const my = Math.min(rt.y1, rt.y2) - 50;
        const px = rt.x1 + (rt.x2 - rt.x1) * cargoPulse;
        const py = rt.y1 + (rt.y2 - rt.y1) * cargoPulse - Math.sin(cargoPulse * Math.PI) * 50;
        return `
          <g>
            <path d="M ${rt.x1} ${rt.y1} Q ${mx} ${my} ${rt.x2} ${rt.y2}" fill="none" stroke="#2a325c" stroke-width="2" stroke-dasharray="6 4" />
            <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${accent}" filter="url(#glow-logistics)" />
            <circle cx="${rt.x1}" cy="${rt.y1}" r="6" fill="${green}" />
            <circle cx="${rt.x2}" cy="${rt.y2}" r="6" fill="${green}" />
          </g>
        `;
      }).join('')}
    </g>

    <!-- Center Right: Fleet Table and On-Time Donut -->
    <rect x="1140" y="260" width="740" height="400" rx="10" fill="#111326" stroke="#1d2242" stroke-width="1.5" />
    <text x="1164" y="294" fill="#ffffff" font-size="15" font-weight="800">LIVE SHIPMENT MANIFEST</text>

    <g transform="translate(1164, 320)">
      ${fleet.map((item, idx) => {
        const fy = idx * 46;
        return `
          <g transform="translate(0, ${fy})">
            <rect x="0" y="0" width="690" height="38" rx="6" fill="#0d0e1c" stroke="#1d2242" stroke-width="1" />
            <text x="14" y="24" fill="#64748b" font-size="11" font-family="monospace">${item.id}</text>
            <text x="120" y="24" fill="#ffffff" font-size="12" font-weight="700">${item.origin} → ${item.dest}</text>
            <text x="420" y="24" fill="#94a3b8" font-size="11">${item.mode}</text>
            <rect x="580" y="8" width="95" height="22" rx="4" fill="${item.col}" fill-opacity="0.15" />
            <text x="627" y="23" fill="${item.col}" font-size="10" font-weight="800" text-anchor="middle">${item.status}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Left: Route Milestone Timeline -->
    <rect x="40" y="680" width="1080" height="360" rx="10" fill="#111326" stroke="#1d2242" stroke-width="1.5" />
    <text x="64" y="714" fill="#ffffff" font-size="14" font-weight="800">CRITICAL CARGO MILESTONE PROGRESSION</text>

    <g transform="translate(64, 780)">
      <!-- Timeline line -->
      <line x1="60" y1="60" x2="960" y2="60" stroke="#1d2242" stroke-width="4" />
      <line x1="60" y1="60" x2="${(60 + 900 * easeOutQuad(p)).toFixed(1)}" y2="60" stroke="${accent}" stroke-width="4" />

      ${[
        { name: 'DISPATCHED', place: 'FACTORY', pct: 0 },
        { name: 'CUSTOMS CLEAR', place: 'PORT TERMINAL', pct: 0.33 },
        { name: 'VESSEL TRANSIT', place: 'PACIFIC SEAWAY', pct: 0.66 },
        { name: 'DESTINATION ARRIVAL', place: 'DISTRIBUTION HUB', pct: 1.0 }
      ].map((dot, idx) => {
        const dx = 60 + idx * 300;
        const isDone = p >= dot.pct;
        return `
          <g transform="translate(${dx}, 60)">
            <circle cx="0" cy="0" r="14" fill="${isDone ? accent : '#1d2242'}" stroke="#ffffff" stroke-width="2" />
            <text x="0" y="38" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">${dot.name}</text>
            <text x="0" y="54" fill="#64748b" font-size="10" text-anchor="middle">${dot.place}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Right: On-Time Donut and Hub Capacities -->
    <rect x="1140" y="680" width="740" height="360" rx="10" fill="#111326" stroke="#1d2242" stroke-width="1.5" />
    <text x="1164" y="714" fill="#ffffff" font-size="14" font-weight="800">SERVICE LEVEL AGREEMENT (SLA)</text>

    <g transform="translate(1500, 850)">
      <circle cx="0" cy="0" r="45" fill="none" stroke="#1d2242" stroke-width="14" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="${green}" stroke-width="14" stroke-dasharray="${donutCirc.toFixed(1)}" stroke-dashoffset="${(donutCirc - parseFloat(donutDash)).toFixed(1)}" transform="rotate(-90)" />
      <text x="0" y="6" fill="#ffffff" font-size="16" font-weight="900" font-family="monospace" text-anchor="middle">${onTimeCur}%</text>
      <text x="0" y="68" fill="#cbd5e1" font-size="11" font-weight="700" text-anchor="middle">ON-TIME DELIVERY</text>
    </g>
  </g>
</svg>`;
  }
};
