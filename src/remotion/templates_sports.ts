import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 6. Sports Analytics Dashboard
// ---------------------------------------------------------------------------
export const templateSportsAnalytics: RemotionTemplate = {
  id: 'sports-analytics',
  name: 'Sports Analytics Dashboard',
  tagline: 'Pitch dark stadium tactical match center with shot map & radar',
  defaultTitle: 'LIVE MATCH TACTICAL INTELLIGENCE',
  defaultAccent: '#ffd60a',
  presetAccents: ['#ffd60a', '#10b981', '#3b82f6', '#ef4444', '#ec4899'],
  scenes: [
    'Scoreboard with flipping digit cards and match clock',
    'Player profile cards with calibrated radar/spider charts',
    'Match timeline with event markers (goals/cards/subs)',
    'Possession donut chart (Home vs Away % dynamic balance)',
    'Shot map dots plotted on pitch diagram with goal flashes',
    'League standings table with position delta indicators',
    'Win probability gauge with animated equilibrium needle',
    'Live commentary ticker tape scrolling continuously'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'LIVE MATCH TACTICAL INTELLIGENCE');
    const accent = opts.accent || '#ffd60a';
    const green = '#10b981';
    const blue = '#3b82f6';
    const bg = '#07120c';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Match clock: 68:20 -> 78:40
    const matchMin = Math.round(68 + 10 * p);
    const matchSec = Math.round((p * 600) % 60);
    const clockStr = `${matchMin}:${matchSec < 10 ? '0' : ''}${matchSec}`;

    // Possession % (Home 58%, Away 42%)
    const homePoss = (58 + 4 * Math.sin(p * Math.PI * 2)).toFixed(0);
    const awayPoss = (100 - parseFloat(homePoss)).toString();
    const possCirc = 2 * Math.PI * 45;
    const possDash = (possCirc * (parseFloat(homePoss) / 100)).toFixed(1);

    // Win probability needle (-50deg to +50deg)
    const winAngle = -10 + 35 * easeOutQuad(p);

    // League table
    const tableTeams = [
      { rank: '1', team: 'VALKYRIE FC', pld: '28', pts: '68', gd: '+42', col: accent },
      { rank: '2', team: 'OLYMPIA UNITED', pld: '28', pts: '64', gd: '+35', col: '#cbd5e1' },
      { rank: '3', team: 'METRO DYNAMO', pld: '28', pts: '59', gd: '+28', col: '#cbd5e1' },
      { rank: '4', team: 'APEX ATHLETIC', pld: '28', pts: '55', gd: '+19', col: '#cbd5e1' }
    ];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-sports" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Header -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#0c1d14" stroke="#163825" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-sports)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">MATCH TRACKER LIVE</text>
    <text x="280" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Scoreboard Banner -->
    <g transform="translate(40, 110)">
      <rect x="0" y="0" width="1840" height="120" rx="10" fill="#0c1d14" stroke="#163825" stroke-width="1.5" />
      
      <!-- Home Team -->
      <text x="60" y="72" fill="#ffffff" font-size="28" font-weight="900" letter-spacing="1">VALKYRIE FC</text>
      <text x="60" y="94" fill="#94a3b8" font-size="11">HOME SQUAD • 4-3-3 ATTACK</text>
      
      <!-- Score Flip Box -->
      <g transform="translate(820, 20)">
        <rect x="0" y="0" width="80" height="80" rx="8" fill="#132e20" stroke="#1f4b33" stroke-width="1.5" />
        <text x="40" y="56" fill="#ffffff" font-size="44" font-weight="900" font-family="monospace" text-anchor="middle">2</text>

        <text x="100" y="52" fill="${accent}" font-size="32" font-weight="900" text-anchor="middle">:</text>

        <rect x="120" y="0" width="80" height="80" rx="8" fill="#132e20" stroke="#1f4b33" stroke-width="1.5" />
        <text x="160" y="56" fill="#ffffff" font-size="44" font-weight="900" font-family="monospace" text-anchor="middle">1</text>
      </g>

      <!-- Match Clock -->
      <g transform="translate(1080, 36)">
        <rect x="0" y="0" width="120" height="48" rx="6" fill="#163825" />
        <circle cx="20" cy="24" r="5" fill="${green}" />
        <text x="65" y="32" fill="#ffffff" font-size="18" font-family="monospace" font-weight="800" text-anchor="middle">${clockStr}'</text>
      </g>

      <!-- Away Team -->
      <text x="1780" y="72" fill="#ffffff" font-size="28" font-weight="900" letter-spacing="1" text-anchor="end">OLYMPIA UTD</text>
      <text x="1780" y="94" fill="#94a3b8" font-size="11" text-anchor="end">AWAY SQUAD • 4-2-3-1 PRESS</text>
    </g>

    <!-- Center Left: Pitch Diagram and Shot Map -->
    <rect x="40" y="250" width="980" height="420" rx="10" fill="#0c1d14" stroke="#163825" stroke-width="1.5" />
    <text x="64" y="284" fill="#ffffff" font-size="15" font-weight="800">TACTICAL SHOT MAP &amp; XG ZONES</text>
    <text x="64" y="302" fill="#64748b" font-size="11">Total Shots: 16 (Home) vs 9 (Away) • xG: 2.14 vs 0.98</text>

    <!-- Pitch Graphic -->
    <g transform="translate(64, 330)">
      <rect x="0" y="0" width="930" height="310" rx="6" fill="#072214" stroke="#16482e" stroke-width="2" />
      <line x1="465" y1="0" x2="465" y2="310" stroke="#16482e" stroke-width="2" />
      <circle cx="465" cy="155" r="50" fill="none" stroke="#16482e" stroke-width="2" />
      <!-- Penalty Boxes -->
      <rect x="0" y="65" width="140" height="180" fill="none" stroke="#16482e" stroke-width="2" />
      <rect x="790" y="65" width="140" height="180" fill="none" stroke="#16482e" stroke-width="2" />
      
      <!-- Shots Home (Yellow) -->
      ${[
        { x: 860, y: 155, isGoal: true },
        { x: 840, y: 110, isGoal: true },
        { x: 800, y: 180, isGoal: false },
        { x: 740, y: 130, isGoal: false },
        { x: 710, y: 220, isGoal: false }
      ].map((shot, idx) => `
        <circle cx="${shot.x}" cy="${shot.y}" r="${shot.isGoal ? 8 : 5}" fill="${shot.isGoal ? accent : '#ffffff'}" stroke="${shot.isGoal ? '#ffffff' : 'none'}" stroke-width="2" opacity="0.9" filter="${shot.isGoal ? 'url(#glow-sports)' : 'none'}" />
      `).join('')}

      <!-- Shots Away (Blue) -->
      ${[
        { x: 60, y: 160, isGoal: true },
        { x: 120, y: 120, isGoal: false },
        { x: 160, y: 200, isGoal: false }
      ].map(shot => `
        <circle cx="${shot.x}" cy="${shot.y}" r="${shot.isGoal ? 8 : 5}" fill="${blue}" opacity="0.9" />
      `).join('')}
    </g>

    <!-- Center Right: Player Spider/Radar Chart and Possession -->
    <rect x="1040" y="250" width="840" height="420" rx="10" fill="#0c1d14" stroke="#163825" stroke-width="1.5" />
    <text x="1064" y="284" fill="#ffffff" font-size="15" font-weight="800">PLAYER TACTICAL RADAR (STRIKER #9)</text>

    <!-- Spider Chart -->
    <g transform="translate(1260, 480)">
      ${[40, 80, 120].map(r => `
        <polygon points="
          ${r * Math.cos(-Math.PI/2)},${r * Math.sin(-Math.PI/2)}
          ${r * Math.cos(-Math.PI/6)},${r * Math.sin(-Math.PI/6)}
          ${r * Math.cos(Math.PI/6)},${r * Math.sin(Math.PI/6)}
          ${r * Math.cos(Math.PI/2)},${r * Math.sin(Math.PI/2)}
          ${r * Math.cos(5*Math.PI/6)},${r * Math.sin(5*Math.PI/6)}
          ${r * Math.cos(7*Math.PI/6)},${r * Math.sin(7*Math.PI/6)}
        " fill="none" stroke="#163825" stroke-width="1.5" />
      `).join('')}

      <!-- Player polygon -->
      <polygon points="
        0,-110
        85,-49
        95,55
        0,90
        -70,40
        -90,-52
      " fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="2.5" />

      <!-- Labels -->
      <text x="0" y="-125" fill="#cbd5e1" font-size="10" font-weight="700" text-anchor="middle">PACE (94)</text>
      <text x="110" y="-45" fill="#cbd5e1" font-size="10" font-weight="700">SHOOTING (91)</text>
      <text x="115" y="65" fill="#cbd5e1" font-size="10" font-weight="700">PASSING (82)</text>
      <text x="0" y="115" fill="#cbd5e1" font-size="10" font-weight="700" text-anchor="middle">DRIBBLE (88)</text>
      <text x="-115" y="45" fill="#cbd5e1" font-size="10" font-weight="700" text-anchor="end">DEFENSE (45)</text>
      <text x="-115" y="-45" fill="#cbd5e1" font-size="10" font-weight="700" text-anchor="end">PHYSICAL (86)</text>
    </g>

    <!-- Possession Donut (Right side of Radar) -->
    <g transform="translate(1680, 460)">
      <circle cx="0" cy="0" r="45" fill="none" stroke="#163825" stroke-width="14" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="${accent}" stroke-width="14" stroke-dasharray="${possCirc.toFixed(1)}" stroke-dashoffset="${(possCirc - parseFloat(possDash)).toFixed(1)}" transform="rotate(-90)" />
      <text x="0" y="6" fill="#ffffff" font-size="18" font-weight="900" font-family="monospace" text-anchor="middle">${homePoss}%</text>
      <text x="0" y="68" fill="#cbd5e1" font-size="11" font-weight="700" text-anchor="middle">POSSESSION</text>
    </g>

    <!-- Bottom Left: League Standings -->
    <rect x="40" y="690" width="980" height="350" rx="10" fill="#0c1d14" stroke="#163825" stroke-width="1.5" />
    <text x="64" y="724" fill="#ffffff" font-size="14" font-weight="800">LIVE LEAGUE STANDINGS TABLE</text>

    <g transform="translate(64, 750)">
      ${tableTeams.map((row, idx) => {
        const ry = idx * 46;
        return `
          <g transform="translate(0, ${ry})">
            <rect x="0" y="0" width="930" height="38" rx="6" fill="#0f261a" stroke="#163825" stroke-width="1" />
            <text x="16" y="24" fill="${row.col}" font-size="12" font-weight="800">${row.rank}</text>
            <text x="50" y="24" fill="#ffffff" font-size="12" font-weight="700">${row.team}</text>
            <text x="680" y="24" fill="#94a3b8" font-size="12" font-family="monospace">PLD: ${row.pld}</text>
            <text x="780" y="24" fill="#94a3b8" font-size="12" font-family="monospace">GD: ${row.gd}</text>
            <text x="890" y="24" fill="${accent}" font-size="14" font-weight="900" font-family="monospace">${row.pts} PTS</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Right: Win Probability Gauge and Ticker -->
    <rect x="1040" y="690" width="840" height="350" rx="10" fill="#0c1d14" stroke="#163825" stroke-width="1.5" />
    <text x="1064" y="724" fill="#ffffff" font-size="14" font-weight="800">IN-PLAY WIN PROBABILITY</text>

    <g transform="translate(1460, 840)">
      <path d="M -90 0 A 90 90 0 0 1 90 0" fill="none" stroke="#163825" stroke-width="14" />
      <path d="M -90 0 A 90 90 0 0 1 90 0" fill="none" stroke="${accent}" stroke-width="14" stroke-dasharray="282" stroke-dashoffset="90" />
      <line x1="0" y1="0" x2="0" y2="-70" stroke="#ffffff" stroke-width="3" stroke-linecap="round" transform="rotate(${winAngle.toFixed(1)})" />
      <circle cx="0" cy="0" r="7" fill="${accent}" />
      <text x="0" y="24" fill="#ffffff" font-size="22" font-weight="900" font-family="monospace" text-anchor="middle">74.2%</text>
      <text x="0" y="42" fill="#94a3b8" font-size="10" font-weight="700" text-anchor="middle">HOME WIN PROBABILITY</text>
    </g>
  </g>
</svg>`;
  }
};
