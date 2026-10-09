import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 7. Weather & Climate Dashboard
// ---------------------------------------------------------------------------
export const templateWeatherClimate: RemotionTemplate = {
  id: 'weather-climate',
  name: 'Weather & Climate Dashboard',
  tagline: 'Storm blue atmospheric radar command with 7-day forecast & wind compass',
  defaultTitle: 'GLOBAL METEOROLOGICAL RADAR',
  defaultAccent: '#00d2ff',
  presetAccents: ['#00d2ff', '#ffd60a', '#ff4d4d', '#a855f7', '#10b981'],
  scenes: [
    'Temperature gauge with count-up degrees and feels-like delta',
    '7-day forecast cards with vector weather glyphs (sun/cloud/rain)',
    'Precipitation bar chart with hourly rainfall accumulation',
    'Wind compass with rotating needle and gust metrics',
    'Humidity progress ring with barometric pressure readings',
    'World map with weather nodes & drifting cloud formations',
    'Radar sweep with expanding concentric rings',
    'Severe-weather alert banner flashing warning status'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'GLOBAL METEOROLOGICAL RADAR');
    const accent = opts.accent || '#00d2ff';
    const amber = '#ffd60a';
    const bg = '#071018';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Temp count-up: 62°F -> 74°F
    const tempF = Math.round(62 + 12 * easeOutQuad(p));

    // Wind compass rotation (integer rotations per duration, e.g. 2 full turns + 45 deg)
    const windAngle = ((p * 2 * 360) + 45) % 360;

    // Radar sweep rotation (4 sweeps per duration)
    const radarAngle = (p * 4 * 360) % 360;

    // Drifting clouds offset (wrapping)
    const cloudOffset = (p * 400) % 400;

    // 7-day forecast data
    const forecast = [
      { day: 'TODAY', high: '74°', low: '58°', icon: 'sun' },
      { day: 'TUE', high: '71°', low: '55°', icon: 'cloud-sun' },
      { day: 'WED', high: '66°', low: '52°', icon: 'rain' },
      { day: 'THU', high: '68°', low: '54°', icon: 'cloud' },
      { day: 'FRI', high: '75°', low: '60°', icon: 'sun' },
      { day: 'SAT', high: '78°', low: '62°', icon: 'sun' },
      { day: 'SUN', high: '70°', low: '56°', icon: 'cloud' }
    ];

    // Precipitation hourly bars (12 hrs)
    const precipBars = [15, 30, 45, 80, 95, 60, 40, 20, 10, 5, 0, 0];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-weather" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Top Warning / Status Bar -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-weather)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">DOPPLER STATION #04</text>
    <text x="280" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <rect x="1440" y="46" width="220" height="32" rx="6" fill="${amber}" fill-opacity="0.15" stroke="${amber}" stroke-width="1" />
    <text x="1550" y="67" fill="${amber}" font-size="11" font-weight="800" text-anchor="middle">MODERATE STORM WATCH</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Left: Hero Temperature Card -->
    <rect x="40" y="110" width="560" height="150" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
    <text x="64" y="140" fill="#94a3b8" font-size="11" font-weight="700">CURRENT AMBIENT TEMPERATURE</text>
    <text x="64" y="200" fill="#ffffff" font-size="52" font-weight="900" font-family="monospace">${tempF}°F</text>
    <text x="210" y="200" fill="#94a3b8" font-size="20">/ 23.3°C</text>
    <text x="64" y="235" fill="${accent}" font-size="12" font-weight="700">FEELS LIKE 76°F • HUMIDITY 68% • UV INDEX: 6</text>

    <!-- 3 Mini Environment Cards -->
    <g transform="translate(620, 110)">
      <!-- Wind Card -->
      <rect x="0" y="0" width="406" height="150" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
      <text x="24" y="34" fill="#94a3b8" font-size="11" font-weight="700">WIND VELOCITY &amp; DIRECTION</text>
      <!-- Wind Compass Needle -->
      <g transform="translate(60, 95)">
        <circle cx="0" cy="0" r="32" fill="#132c42" stroke="#1f4466" stroke-width="1.5" />
        <g transform="rotate(${windAngle.toFixed(1)})">
          <polygon points="0,-24 6,0 0,6 -6,0" fill="${accent}" />
        </g>
      </g>
      <text x="110" y="90" fill="#ffffff" font-size="24" font-weight="900" font-family="monospace">18 MPH</text>
      <text x="110" y="112" fill="#94a3b8" font-size="11">GUSTS UP TO 28 MPH (NE)</text>

      <!-- Barometric Pressure -->
      <g transform="translate(426, 0)">
        <rect x="0" y="0" width="406" height="150" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
        <text x="24" y="34" fill="#94a3b8" font-size="11" font-weight="700">BAROMETRIC PRESSURE</text>
        <text x="24" y="85" fill="#ffffff" font-size="28" font-weight="900" font-family="monospace">29.92 inHg</text>
        <text x="24" y="112" fill="${accent}" font-size="11" font-weight="700">STEADY • 1013.2 MBAR</text>
      </g>

      <!-- Air Quality Index -->
      <g transform="translate(852, 0)">
        <rect x="0" y="0" width="406" height="150" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
        <text x="24" y="34" fill="#94a3b8" font-size="11" font-weight="700">AIR QUALITY (AQI)</text>
        <text x="24" y="85" fill="#10b981" font-size="28" font-weight="900" font-family="monospace">38 AQI</text>
        <text x="24" y="112" fill="#10b981" font-size="11" font-weight="700">GOOD • LOW PM2.5 POLLUTION</text>
      </g>
    </g>

    <!-- Center Left: Doppler Radar Screen -->
    <rect x="40" y="280" width="1080" height="420" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
    <text x="64" y="314" fill="#ffffff" font-size="15" font-weight="800">DOPPLER PRECIPITATION REFLECTIVITY</text>
    <text x="64" y="332" fill="#64748b" font-size="11">Active sweep across 250km radius sector</text>

    <!-- Circular Radar Screen -->
    <g transform="translate(580, 500)">
      <circle cx="0" cy="0" r="150" fill="#091520" stroke="#16344d" stroke-width="2" />
      <circle cx="0" cy="0" r="100" fill="none" stroke="#16344d" stroke-width="1" stroke-dasharray="3 3" />
      <circle cx="0" cy="0" r="50" fill="none" stroke="#16344d" stroke-width="1" />
      <line x1="-150" y1="0" x2="150" y2="0" stroke="#16344d" stroke-width="1" />
      <line x1="0" y1="-150" x2="0" y2="150" stroke="#16344d" stroke-width="1" />

      <!-- Storm Cluster Blobs -->
      <circle cx="45" cy="-60" r="28" fill="${accent}" fill-opacity="0.3" filter="url(#glow-weather)" />
      <circle cx="60" cy="-50" r="18" fill="${amber}" fill-opacity="0.4" />

      <!-- Sweeping Radar Line -->
      <g transform="rotate(${radarAngle.toFixed(1)})">
        <line x1="0" y1="0" x2="150" y2="0" stroke="${accent}" stroke-width="2.5" filter="url(#glow-weather)" />
        <polygon points="0,0 150,-35 150,0" fill="${accent}" fill-opacity="0.18" />
      </g>
    </g>

    <!-- Center Right: 7-Day Forecast Cards -->
    <rect x="1140" y="280" width="740" height="420" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
    <text x="1164" y="314" fill="#ffffff" font-size="15" font-weight="800">7-DAY METEOROLOGICAL FORECAST</text>

    <g transform="translate(1164, 340)">
      ${forecast.map((fc, idx) => {
        const fy = idx * 48;
        return `
          <g transform="translate(0, ${fy})">
            <rect x="0" y="0" width="690" height="40" rx="6" fill="#11273b" stroke="#16344d" stroke-width="1" />
            <text x="16" y="25" fill="#ffffff" font-size="12" font-weight="700">${fc.day}</text>
            <!-- Vector weather symbol -->
            <circle cx="220" cy="20" r="8" fill="${amber}" />
            <text x="560" y="25" fill="#ffffff" font-size="13" font-family="monospace" font-weight="800">${fc.high}</text>
            <text x="640" y="25" fill="#94a3b8" font-size="13" font-family="monospace">${fc.low}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Left: Precipitation Hourly Bar Chart -->
    <rect x="40" y="720" width="1080" height="320" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
    <text x="64" y="754" fill="#ffffff" font-size="14" font-weight="800">12-HOUR PRECIPITATION ACCUMULATION (MM)</text>

    <g transform="translate(64, 780)">
      ${precipBars.map((val, idx) => {
        const bx = idx * 85 + 20;
        const bH = (val / 100) * 160 * easeOutQuad(p);
        const by = 180 - bH;
        return `
          <g>
            <rect x="${bx}" y="${by.toFixed(1)}" width="42" height="${bH.toFixed(1)}" rx="4" fill="${val > 70 ? amber : accent}" opacity="0.85" />
            <text x="${bx + 21}" y="205" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle">+${idx * 2}h</text>
            <text x="${bx + 21}" y="${(by - 6).toFixed(1)}" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="middle">${val}%</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Right: Drifting Cloud Simulation -->
    <rect x="1140" y="720" width="740" height="320" rx="10" fill="#0d1f2e" stroke="#16344d" stroke-width="1.5" />
    <text x="1164" y="754" fill="#ffffff" font-size="14" font-weight="800">CLOUD WATER VAPOR SATELLITE LOOP</text>

    <g transform="translate(1164, 780)">
      <g transform="translate(${cloudOffset.toFixed(1)}, 0)">
        <!-- Generic vector cloud clusters -->
        <ellipse cx="60" cy="80" rx="80" ry="35" fill="#1e3a54" opacity="0.6" />
        <ellipse cx="260" cy="60" rx="120" ry="45" fill="#1e3a54" opacity="0.7" />
        <ellipse cx="500" cy="110" rx="90" ry="40" fill="#1e3a54" opacity="0.5" />
        <!-- Wrapped copy -->
        <ellipse cx="-340" cy="80" rx="80" ry="35" fill="#1e3a54" opacity="0.6" />
        <ellipse cx="-140" cy="60" rx="120" ry="45" fill="#1e3a54" opacity="0.7" />
      </g>
    </g>
  </g>
</svg>`;
  }
};
