import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 3. Social Media Growth / Marketing
// ---------------------------------------------------------------------------
export const templateSocialGrowth: RemotionTemplate = {
  id: 'social-growth',
  name: 'Social Media Growth / Marketing',
  tagline: 'Deep purple viral growth engine with follower counters & race charts',
  defaultTitle: 'GLOBAL INFLUENCE AND VIRAL REACH',
  defaultAccent: '#ec4899',
  presetAccents: ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'],
  scenes: [
    'Big follower counter with +N popup bursts',
    'Engagement multi-line chart drawing itself dynamically',
    'Platform cards with growth % chips & generic glyphs',
    'Animated bar chart race with bars dynamically reordering',
    'Traffic sources donut with animated segments',
    'Viral post card with ticking like and comment counters',
    'Hashtag ticker tape seamlessly scrolling',
    '7x24 audience activity heatmap lighting up cell by cell'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'GLOBAL INFLUENCE & VIRAL REACH');
    const accent = opts.accent || '#ec4899';
    const cyan = '#06b6d4';
    const purple = '#8b5cf6';
    const bg = '#0d071a';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Follower counter: 840,200 -> 1,250,400
    const followerEased = easeOutQuad(p);
    const followers = Math.round(840200 + (1250400 - 840200) * followerEased).toLocaleString('en-US');

    // Follower burst popup: bursts every 1/4 of duration
    const burstCycle = (p * 4) % 1;
    const burstOpacity = (1 - burstCycle) * 0.9;
    const burstY = 20 - burstCycle * 18;

    // Engagement multi-line chart points
    const chartLenEst = 1200;
    const dashOffset = chartLenEst * (1 - easeOutQuad(p));

    // Platform race bars: 4 platforms reordering over duration
    // Platform A starts 1st, B overtakes at 50%
    const barRng = createRng(44);
    const platforms = [
      { name: 'SHORT VIDEO FEED', base: 450, growth: 520, color: accent },
      { name: 'DISCOVERY FEED', base: 480, growth: 380, color: cyan },
      { name: 'BROADCAST CHANNEL', base: 310, growth: 420, color: purple },
      { name: 'COMMUNITY FORUM', base: 260, growth: 290, color: '#f59e0b' }
    ].map(item => ({
      ...item,
      val: Math.round(item.base + item.growth * easeOutQuad(p))
    })).sort((a, b) => b.val - a.val);

    // Traffic sources donut (Search, Social, Direct, Referral)
    const donutCirc = 2 * Math.PI * 50;
    const socialPct = (48 * easeOutQuad(p)).toFixed(1);
    const donutDash = (donutCirc * (parseFloat(socialPct) / 100)).toFixed(1);

    // Viral post ticking counters
    const likes = Math.round(48200 + 72100 * easeOutQuad(p)).toLocaleString('en-US');
    const comments = Math.round(3410 + 5120 * easeOutQuad(p)).toLocaleString('en-US');
    const shares = Math.round(1890 + 2940 * easeOutQuad(p)).toLocaleString('en-US');

    // Hashtag ticker tape: integer loops
    const tickerLoops = 3;
    const tickerShift = -((p * tickerLoops) % 1) * 600;

    // 7x12 activity heatmap grid
    const heatRng = createRng(888);
    const totalCells = 7 * 12;
    const cellsLit = Math.floor(p * totalCells);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-social" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Top Command Bar -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-social)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">CAMPAIGN REACH</text>
    <text x="250" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Left: Hero Follower Counter -->
    <rect x="40" y="110" width="560" height="130" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
    <text x="64" y="140" fill="#c084fc" font-size="11" font-weight="700" letter-spacing="1">AGGREGATE AUDIENCE REACH</text>
    <text x="64" y="185" fill="#ffffff" font-size="40" font-weight="900" font-family="monospace">${followers}</text>
    <rect x="430" y="135" width="150" height="30" rx="6" fill="${accent}" fill-opacity="0.2" />
    <text x="505" y="155" fill="${accent}" font-size="12" font-weight="800" text-anchor="middle">+48.8% NET NEW</text>
    
    <!-- Burst popup badge -->
    <g transform="translate(340, ${140 + burstY})" opacity="${burstOpacity.toFixed(2)}">
      <rect x="0" y="0" width="75" height="22" rx="4" fill="${cyan}" />
      <text x="37" y="15" fill="#000000" font-size="11" font-weight="900" text-anchor="middle">+1,240</text>
    </g>

    <!-- Top 3 Platform Cards -->
    ${[
      { name: 'SHORT VIDEO', metric: '64.2M IMP', growth: '+124%', icon: 'M 10 6 L 22 14 L 10 22 Z' },
      { name: 'COMMUNITY HUB', metric: '18.9M ENG', growth: '+82%', icon: 'M 6 14 A 8 8 0 1 1 22 14 A 8 8 0 1 1 6 14 Z' },
      { name: 'STORIES FEED', metric: '8.4M TAPS', growth: '+45%', icon: 'M 6 6 H 22 V 22 H 6 Z' }
    ].map((plat, idx) => {
      const px = 620 + idx * 426;
      return `
        <g transform="translate(${px}, 110)">
          <rect x="0" y="0" width="406" height="130" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
          <rect x="24" y="24" width="36" height="36" rx="8" fill="#2b1652" />
          <path d="${plat.icon}" transform="translate(28, 28)" fill="${accent}" />
          <text x="72" y="42" fill="#ffffff" font-size="13" font-weight="700">${plat.name}</text>
          <text x="72" y="56" fill="#94a3b8" font-size="10">CROSS-CHANNEL SYNDICATED</text>
          <text x="24" y="104" fill="#ffffff" font-size="24" font-weight="800" font-family="monospace">${plat.metric}</text>
          <rect x="280" y="80" width="100" height="26" rx="5" fill="${cyan}" fill-opacity="0.15" />
          <text x="330" y="97" fill="${cyan}" font-size="12" font-weight="800" text-anchor="middle">${plat.growth}</text>
        </g>
      `;
    }).join('')}

    <!-- Center Left: Engagement Multi-Line Chart -->
    <rect x="40" y="260" width="1080" height="390" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
    <text x="64" y="294" fill="#ffffff" font-size="15" font-weight="800">DAILY VIRALITY &amp; ENGAGEMENT VELOCITY</text>
    <text x="64" y="312" fill="#94a3b8" font-size="11">Active interactions (likes, shares, mentions) over 30 days</text>

    <g transform="translate(64, 340)">
      ${[0, 1, 2, 3].map(i => `
        <line x1="0" y1="${i * 70}" x2="1020" y2="${i * 70}" stroke="#2b1652" stroke-width="1" stroke-dasharray="3 3" />
        <text x="1030" y="${i * 70 + 4}" fill="#64748b" font-size="10" font-family="monospace">${100 - i * 25}K</text>
      `).join('')}

      <!-- Series 1 (Accent) -->
      <path d="M 0 200 Q 250 180 500 90 T 1000 30" fill="none" stroke="${accent}" stroke-width="3.5" stroke-dasharray="${chartLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" filter="url(#glow-social)" />
      <!-- Series 2 (Cyan) -->
      <path d="M 0 210 Q 300 160 600 130 T 1000 60" fill="none" stroke="${cyan}" stroke-width="2.5" stroke-dasharray="${chartLenEst}" stroke-dashoffset="${dashOffset.toFixed(1)}" />
    </g>

    <!-- Center Right: Animated Bar Chart Race -->
    <rect x="1140" y="260" width="740" height="390" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
    <text x="1164" y="294" fill="#ffffff" font-size="15" font-weight="800">CHANNEL LEADERBOARD RACE</text>
    <text x="1164" y="312" fill="#94a3b8" font-size="11">Real-time follower acquisition dynamic ranking</text>

    <g transform="translate(1164, 340)">
      ${platforms.map((plat, idx) => {
        const by = idx * 64;
        const bWidth = Math.max(20, (plat.val / 1000) * 480);
        return `
          <g transform="translate(0, ${by})">
            <text x="0" y="16" fill="#cbd5e1" font-size="11" font-weight="700">#${idx + 1} ${plat.name}</text>
            <text x="690" y="16" fill="${plat.color}" font-size="12" font-family="monospace" font-weight="800" text-anchor="end">${plat.val}K</text>
            <rect x="0" y="26" width="690" height="14" rx="4" fill="#2b1652" />
            <rect x="0" y="26" width="${bWidth.toFixed(1)}" height="14" rx="4" fill="${plat.color}" filter="url(#glow-social)" />
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Left: Viral Post Spotlight -->
    <rect x="40" y="670" width="600" height="370" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
    <text x="64" y="704" fill="#ffffff" font-size="14" font-weight="800">VIRAL ASSET BENCHMARK</text>
    
    <g transform="translate(64, 730)">
      <rect x="0" y="0" width="550" height="80" rx="8" fill="#21103f" stroke="#371a68" stroke-width="1" />
      <rect x="16" y="16" width="48" height="48" rx="8" fill="${accent}" fill-opacity="0.3" />
      <circle cx="40" cy="40" r="12" fill="${accent}" />
      <text x="76" y="34" fill="#ffffff" font-size="13" font-weight="700">"Behind The Scenes: Studio V3"</text>
      <text x="76" y="52" fill="#94a3b8" font-size="11">Posted 4h ago • Global Trending #1</text>

      <!-- 3 Metrics (Likes, Comments, Shares) -->
      <g transform="translate(0, 100)">
        <rect x="0" y="0" width="170" height="70" rx="8" fill="#1f0f3b" />
        <text x="16" y="24" fill="#94a3b8" font-size="10" font-weight="700">LIKES</text>
        <text x="16" y="52" fill="#ffffff" font-size="20" font-family="monospace" font-weight="800">${likes}</text>

        <rect x="190" y="0" width="170" height="70" rx="8" fill="#1f0f3b" />
        <text x="206" y="24" fill="#94a3b8" font-size="10" font-weight="700">COMMENTS</text>
        <text x="206" y="52" fill="${cyan}" font-size="20" font-family="monospace" font-weight="800">${comments}</text>

        <rect x="380" y="0" width="170" height="70" rx="8" fill="#1f0f3b" />
        <text x="396" y="24" fill="#94a3b8" font-size="10" font-weight="700">SHARES</text>
        <text x="396" y="52" fill="${accent}" font-size="20" font-family="monospace" font-weight="800">${shares}</text>
      </g>

      <!-- Hashtag Ticker -->
      <g transform="translate(0, 200)">
        <rect x="0" y="0" width="550" height="34" rx="6" fill="#170c2e" stroke="#2b1652" stroke-width="1" />
        <g clip-path="url(#ticker-clip)">
          <g transform="translate(${tickerShift.toFixed(1)}, 0)">
            <text x="0" y="22" fill="#c084fc" font-size="11" font-family="monospace" font-weight="700">
              #TRENDING &#160; #CREATIVE &#160; #VIRAL_CAMPAIGN &#160; #GROWTH_HACK &#160; #REACH_PEAK &#160; #STUDIO_V3 &#160; #GLOBAL_EXPANSION
            </text>
          </g>
        </g>
      </g>
    </g>

    <!-- Bottom Center: 7x12 Heatmap Grid -->
    <rect x="660" y="670" width="680" height="370" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
    <text x="684" y="704" fill="#ffffff" font-size="14" font-weight="800">AUDIENCE ACTIVITY HEATMAP (7x12)</text>
    <text x="684" y="722" fill="#94a3b8" font-size="11">Peak engagement concentration by day &amp; hour</text>

    <g transform="translate(684, 750)">
      ${Array.from({ length: 7 }, (_, d) => {
        const dy = d * 32;
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        return `
          <text x="0" y="${dy + 18}" fill="#94a3b8" font-size="10" font-weight="700">${days[d]}</text>
          ${Array.from({ length: 12 }, (_, h) => {
            const hx = 45 + h * 48;
            const cellIdx = d * 12 + h;
            const isLit = cellIdx <= cellsLit;
            const intensity = heatRng();
            const fillCol = isLit ? (intensity > 0.6 ? accent : cyan) : '#22113f';
            const opacity = isLit ? (0.3 + intensity * 0.7) : 0.4;
            return `
              <rect x="${hx}" y="${dy}" width="42" height="24" rx="4" fill="${fillCol}" opacity="${opacity.toFixed(2)}" />
            `;
          }).join('')}
        `;
      }).join('')}
    </g>

    <!-- Bottom Right: Traffic Sources Donut -->
    <rect x="1360" y="670" width="520" height="370" rx="10" fill="#170c2e" stroke="#2b1652" stroke-width="1.5" />
    <text x="1384" y="704" fill="#ffffff" font-size="14" font-weight="800">TRAFFIC ACQUISITION</text>

    <g transform="translate(1620, 840)">
      <circle cx="0" cy="0" r="60" fill="none" stroke="#2b1652" stroke-width="18" />
      <circle cx="0" cy="0" r="60" fill="none" stroke="${accent}" stroke-width="18" stroke-dasharray="${donutCirc.toFixed(1)}" stroke-dashoffset="${(donutCirc - parseFloat(donutDash)).toFixed(1)}" transform="rotate(-90)" filter="url(#glow-social)" />
      <text x="0" y="8" fill="#ffffff" font-size="20" font-weight="900" font-family="monospace" text-anchor="middle">${socialPct}%</text>
      <text x="0" y="85" fill="#c084fc" font-size="11" font-weight="700" text-anchor="middle">SOCIAL INFLUENCE</text>
    </g>
  </g>
</svg>`;
  }
};
