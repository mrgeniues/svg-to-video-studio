import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 5. Health & Fitness Dashboard
// ---------------------------------------------------------------------------
export const templateHealthFitness: RemotionTemplate = {
  id: 'health-fitness',
  name: 'Health & Fitness Dashboard',
  tagline: 'High-energy biometric performance hub with ECG wave & activity rings',
  defaultTitle: 'BIOMETRIC ATHLETIC TELEMETRY',
  defaultAccent: '#b6ff2e',
  presetAccents: ['#b6ff2e', '#00f2fe', '#ff007f', '#ffd60a', '#10b981'],
  scenes: [
    'Step counter ring filling with % and live target counter',
    'Pulsing ECG heart-rate line sweeping across display',
    'Calorie burn donut with active vs rest breakdown',
    'Weekly activity bar chart growing day by day',
    'Sleep stages stacked horizontal bars with REM metrics',
    'Workout streak calendar grid lighting up active days',
    'Weight trend line with dashed target threshold line',
    'Activity timeline with event dots dynamically appearing'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'BIOMETRIC ATHLETIC TELEMETRY');
    const accent = opts.accent || '#b6ff2e';
    const teal = '#00f2fe';
    const coral = '#ff007f';
    const bg = '#070a0d';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Steps count-up: 6,420 -> 12,850
    const steps = Math.round(6420 + (12850 - 6420) * easeOutQuad(p)).toLocaleString('en-US');
    const stepPct = Math.round((parseFloat(steps.replace(/,/g, '')) / 15000) * 100);
    const stepCirc = 2 * Math.PI * 55;
    const stepDash = (stepCirc * (stepPct / 100)).toFixed(1);

    // ECG Heart Rate: sweeping wave
    const ecgSweep = (p * 4) % 1; // 4 sweep cycles
    const ecgBpm = Math.round(138 + 6 * Math.sin(p * Math.PI * 6));

    // Calories: 1,840 / 2,400 kcal
    const calVal = Math.round(1240 + (2180 - 1240) * easeOutQuad(p)).toLocaleString('en-US');

    // Weekly activity bars
    const weekDays = [
      { day: 'MON', val: 78, color: accent },
      { day: 'TUE', val: 92, color: accent },
      { day: 'WED', val: 65, color: teal },
      { day: 'THU', val: 110, color: accent },
      { day: 'FRI', val: 84, color: accent },
      { day: 'SAT', val: 125, color: accent },
      { day: 'SUN', val: 95, color: teal }
    ];

    // Sleep stages (Deep, Core, REM, Awake)
    const sleepDeep = 82;
    const sleepCore = 184;
    const sleepRem = 96;
    const sleepAwake = 24;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-fit" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Top Bar -->
    <rect x="40" y="30" width="1840" height="64" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="${accent}" filter="url(#glow-fit)" />
    <text x="88" y="66" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">ATHLETE SENSORS ACTIVE</text>
    <text x="310" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    <text x="1780" y="66" fill="#94a3b8" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Top Left: Hero Steps Ring Card -->
    <rect x="40" y="110" width="560" height="150" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
    <g transform="translate(115, 185)">
      <circle cx="0" cy="0" r="55" fill="none" stroke="#1c2838" stroke-width="12" />
      <circle cx="0" cy="0" r="55" fill="none" stroke="${accent}" stroke-width="12" stroke-dasharray="${stepCirc.toFixed(1)}" stroke-dashoffset="${(stepCirc - parseFloat(stepDash)).toFixed(1)}" transform="rotate(-90)" filter="url(#glow-fit)" />
      <text x="0" y="8" fill="#ffffff" font-size="20" font-weight="900" font-family="monospace" text-anchor="middle">${stepPct}%</text>
    </g>
    <g transform="translate(195, 145)">
      <text x="0" y="0" fill="#94a3b8" font-size="11" font-weight="700">DAILY STEP GOAL</text>
      <text x="0" y="38" fill="#ffffff" font-size="34" font-weight="900" font-family="monospace">${steps}</text>
      <text x="0" y="62" fill="#94a3b8" font-size="11">GOAL: 15,000 STEPS • 8.6 KM</text>
    </g>

    <!-- Top 3 Metric Cards (Heart Rate, Calories, Active Zone) -->
    <g transform="translate(620, 110)">
      <!-- Heart Rate -->
      <rect x="0" y="0" width="406" height="150" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
      <text x="24" y="36" fill="#94a3b8" font-size="11" font-weight="700">LIVE HEART RATE</text>
      <text x="24" y="84" fill="${coral}" font-size="38" font-weight="900" font-family="monospace">${ecgBpm}</text>
      <text x="125" y="84" fill="#94a3b8" font-size="16" font-weight="700">BPM</text>
      <text x="24" y="116" fill="${coral}" font-size="11" font-weight="700">AEROBIC TRAINING ZONE (84% MAX)</text>

      <!-- Active Calories -->
      <g transform="translate(426, 0)">
        <rect x="0" y="0" width="406" height="150" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
        <text x="24" y="36" fill="#94a3b8" font-size="11" font-weight="700">ACTIVE CALORIES BURNED</text>
        <text x="24" y="84" fill="#ffffff" font-size="38" font-weight="900" font-family="monospace">${calVal}</text>
        <text x="150" y="84" fill="#94a3b8" font-size="16" font-weight="700">KCAL</text>
        <text x="24" y="116" fill="${teal}" font-size="11" font-weight="700">+340 KCAL vs 7-DAY AVERAGE</text>
      </g>

      <!-- Recovery Score -->
      <g transform="translate(852, 0)">
        <rect x="0" y="0" width="406" height="150" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
        <text x="24" y="36" fill="#94a3b8" font-size="11" font-weight="700">STRAIN &amp; RECOVERY</text>
        <text x="24" y="84" fill="${accent}" font-size="38" font-weight="900" font-family="monospace">91%</text>
        <text x="110" y="84" fill="#94a3b8" font-size="16" font-weight="700">OPTIMAL</text>
        <text x="24" y="116" fill="${accent}" font-size="11" font-weight="700">READY FOR MAXIMUM EXERTION</text>
      </g>
    </g>

    <!-- Center Left: Real-Time ECG Line -->
    <rect x="40" y="280" width="1080" height="360" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
    <text x="64" y="314" fill="#ffffff" font-size="15" font-weight="800">CONTINUOUS LEAD-II ELECTROCARDIOGRAM (ECG)</text>
    <text x="64" y="332" fill="#64748b" font-size="11">Real-time QRS complex waveform &amp; RR interval telemetry</text>

    <g transform="translate(64, 360)">
      <!-- Grid -->
      ${[0, 1, 2, 3, 4].map(i => `
        <line x1="0" y1="${i * 50}" x2="1020" y2="${i * 50}" stroke="#1c2838" stroke-width="1" stroke-dasharray="2 2" />
      `).join('')}

      <!-- ECG Waveform Pattern -->
      <path d="M 0 100 L 150 100 L 170 90 L 185 100 L 200 40 L 215 150 L 230 100 L 255 100 L 280 85 L 305 100 L 450 100 L 470 90 L 485 100 L 500 40 L 515 150 L 530 100 L 555 100 L 580 85 L 605 100 L 750 100 L 770 90 L 785 100 L 800 40 L 815 150 L 830 100 L 855 100 L 880 85 L 905 100 L 1020 100" fill="none" stroke="${coral}" stroke-width="3" filter="url(#glow-fit)" />

      <!-- Sweeping cursor dot -->
      <circle cx="${(1020 * ecgSweep).toFixed(1)}" cy="100" r="5" fill="#ffffff" filter="url(#glow-fit)" />
    </g>

    <!-- Center Right: Weekly Activity Bars -->
    <rect x="1140" y="280" width="740" height="360" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
    <text x="1164" y="314" fill="#ffffff" font-size="15" font-weight="800">WEEKLY EXERTION VOLUME</text>
    <text x="1164" y="332" fill="#64748b" font-size="11">Daily training intensity vs baseline goal (100 pts)</text>

    <g transform="translate(1164, 380)">
      <line x1="0" y1="120" x2="690" y2="120" stroke="#1c2838" stroke-width="1" stroke-dasharray="4 4" />
      <text x="690" y="115" fill="#64748b" font-size="10" font-family="monospace" text-anchor="end">GOAL: 100</text>

      ${weekDays.map((d, idx) => {
        const bx = idx * 95 + 20;
        const barH = (d.val / 140) * 180 * easeOutQuad(p);
        const by = 200 - barH;
        return `
          <g>
            <rect x="${bx}" y="${by.toFixed(1)}" width="45" height="${barH.toFixed(1)}" rx="6" fill="${d.color}" />
            <text x="${bx + 22}" y="225" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle">${d.day}</text>
            <text x="${bx + 22}" y="${(by - 8).toFixed(1)}" fill="#ffffff" font-size="11" font-family="monospace" font-weight="800" text-anchor="middle">${d.val}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Left: Sleep Stages Analysis -->
    <rect x="40" y="660" width="880" height="380" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
    <text x="64" y="694" fill="#ffffff" font-size="14" font-weight="800">SLEEP ARCHITECTURE &amp; STAGES</text>
    <text x="64" y="712" fill="#64748b" font-size="11">Total Duration: 7h 46m • Sleep Efficiency: 94%</text>

    <g transform="translate(64, 740)">
      <!-- Stacked Sleep Bar -->
      <rect x="0" y="0" width="820" height="24" rx="6" fill="#1c2838" />
      <rect x="0" y="0" width="${(820 * (sleepDeep / 386)).toFixed(1)}" height="24" rx="6" fill="${accent}" />
      <rect x="${(820 * (sleepDeep / 386)).toFixed(1)}" y="0" width="${(820 * (sleepCore / 386)).toFixed(1)}" height="24" fill="${teal}" />
      <rect x="${(820 * ((sleepDeep + sleepCore) / 386)).toFixed(1)}" y="0" width="${(820 * (sleepRem / 386)).toFixed(1)}" height="24" fill="${coral}" />

      <!-- Legend -->
      <g transform="translate(0, 50)">
        <rect x="0" y="0" width="12" height="12" rx="3" fill="${accent}" />
        <text x="20" y="10" fill="#cbd5e1" font-size="11" font-weight="600">DEEP (1h 22m)</text>

        <rect x="180" y="0" width="12" height="12" rx="3" fill="${teal}" />
        <text x="200" y="10" fill="#cbd5e1" font-size="11" font-weight="600">CORE (3h 04m)</text>

        <rect x="360" y="0" width="12" height="12" rx="3" fill="${coral}" />
        <text x="380" y="10" fill="#cbd5e1" font-size="11" font-weight="600">REM (1h 36m)</text>
      </g>
    </g>

    <!-- Bottom Right: Workout Streak Grid -->
    <rect x="940" y="660" width="940" height="380" rx="10" fill="#0f161f" stroke="#1c2838" stroke-width="1.5" />
    <text x="964" y="694" fill="#ffffff" font-size="14" font-weight="800">30-DAY WORKOUT STREAK MATRIX</text>
    <text x="964" y="712" fill="#64748b" font-size="11">Active training consistency: 26 / 30 days completed</text>

    <g transform="translate(964, 740)">
      ${Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) => {
          const idx = row * 6 + col;
          const cxP = col * 145;
          const cyP = row * 45;
          const isDone = idx < 26;
          return `
            <g transform="translate(${cxP}, ${cyP})">
              <rect x="0" y="0" width="130" height="36" rx="6" fill="${isDone ? '#142928' : '#141a24'}" stroke="${isDone ? accent : '#1c2838'}" stroke-width="1" />
              <text x="14" y="22" fill="#cbd5e1" font-size="11" font-weight="700">DAY ${idx + 1}</text>
              <text x="116" y="22" fill="${isDone ? accent : '#64748b'}" font-size="10" font-weight="800" text-anchor="end">${isDone ? 'COMPLETED' : 'REST'}</text>
            </g>
          `;
        }).join('')
      ).join('')}
    </g>
  </g>
</svg>`;
  }
};
