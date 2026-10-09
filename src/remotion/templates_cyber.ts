import { RemotionTemplate, TemplateRenderOpts, escapeXml, createRng } from './templates';

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// 2. Cybersecurity Command Center
// ---------------------------------------------------------------------------
export const templateCybersecurity: RemotionTemplate = {
  id: 'cybersecurity-command',
  name: 'Cybersecurity Command Center',
  tagline: 'Black-red alert SOC defense grid with threat arcs & rotating radar',
  defaultTitle: 'GLOBAL THREAT INTELLIGENCE SOC',
  defaultAccent: '#ff2244',
  presetAccents: ['#ff2244', '#00ff9d', '#ff8800', '#00d2ff', '#a855f7'],
  scenes: [
    'World dotted map with pulsing threat nodes & arcing attack lines',
    'Live threat log table with CRITICAL/HIGH/MED severity chips',
    'Shield emblem with continuous rotating radar scan ring',
    'Firewall status toggles actively switching states',
    'Blocked-attacks counter counting up into millions',
    'Network topology graph with traveling data defense pulses',
    'Flashing alert banners cycling seamlessly across duration',
    'Encryption progress bars with dynamic % counters'
  ],
  renderFrame: (t: number, duration: number, W: number, H: number, opts: TemplateRenderOpts) => {
    const titleEsc = escapeXml(opts.title || 'GLOBAL THREAT INTELLIGENCE SOC');
    const accent = opts.accent || '#ff2244';
    const green = '#00ff9d';
    const bg = '#06070a';

    const p = duration > 0 ? clamp(t / duration, 0, 1) : 0;
    const zoom = 1.0 + 0.04 * p;
    const cx = 960;
    const cy = 540;

    // Integer frequency cycles
    const flashCycles = (p * 6) % 1;
    const isFlashRed = flashCycles < 0.5;
    const radarRot = (p * 4 * 360) % 360;
    const pulseTravel = (p * 5) % 1;

    // Blocked counter count-up: 1,420,800 -> 1,894,300
    const countEased = easeOutQuad(p);
    const attacksBlocked = Math.round(1420800 + (1894300 - 1420800) * countEased).toLocaleString('en-US');

    // Encryption progress
    const encTarget = 94.6;
    const encVal = (encTarget * easeOutQuad(clamp(p / 0.8, 0, 1))).toFixed(1);

    // Threat log items
    const threats = [
      { id: 'EVT-9041', ip: '198.51.100.24', type: 'DDoS SYN Flood', sev: 'CRITICAL', color: accent },
      { id: 'EVT-9040', ip: '203.0.113.88', type: 'Zero-Day RCE Exploit', sev: 'CRITICAL', color: accent },
      { id: 'EVT-9039', ip: '192.0.2.145', type: 'SQL Injection Probe', sev: 'HIGH', color: '#ff8800' },
      { id: 'EVT-9038', ip: '185.220.101.5', type: 'Brute Force SSH Attack', sev: 'HIGH', color: '#ff8800' },
      { id: 'EVT-9037', ip: '104.244.42.1', type: 'Port Sweep / Lateral Move', sev: 'MED', color: '#ffd60a' },
      { id: 'EVT-9036', ip: '172.56.21.90', type: 'DNS Tunneling Anomaly', sev: 'MED', color: '#ffd60a' }
    ];

    // Dotted world map attack nodes
    const attackArcs = [
      { x1: 240, y1: 180, x2: 680, y2: 240 },
      { x1: 720, y1: 160, x2: 320, y2: 260 },
      { x1: 450, y1: 130, x2: 820, y2: 300 }
    ];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1920 1080" style="background:${bg}; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="glow-cyber" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx}, ${cy}) scale(${zoom.toFixed(4)}) translate(${-cx}, ${-cy})">
    <!-- Top Alert Bar -->
    <rect x="40" y="30" width="1840" height="64" rx="8" fill="#12060a" stroke="${accent}" stroke-opacity="0.6" stroke-width="1.5" />
    <rect x="54" y="44" width="12" height="36" rx="2" fill="${accent}" opacity="${isFlashRed ? 1 : 0.3}" filter="url(#glow-cyber)" />
    <text x="78" y="66" fill="${accent}" font-size="13" font-weight="900" letter-spacing="2">DEFCON 2 ALERT ACTIVE</text>
    <text x="320" y="67" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="1.5">${titleEsc}</text>
    
    <!-- Blocked Attacks Counter Pill -->
    <rect x="1420" y="44" width="260" height="36" rx="6" fill="#1f0910" stroke="${accent}" stroke-width="1" />
    <text x="1436" y="67" fill="#cbd5e1" font-size="11" font-weight="600">ATTACKS BLOCKED:</text>
    <text x="1660" y="67" fill="${green}" font-size="14" font-family="monospace" font-weight="800" text-anchor="end">${attacksBlocked}</text>
    <text x="1780" y="66" fill="#64748b" font-size="12" font-family="monospace">T+${t.toFixed(2)}s / ${duration.toFixed(1)}s</text>

    <!-- Center Left: World Map with Threat Nodes and Arcs -->
    <rect x="40" y="110" width="1120" height="520" rx="10" fill="#0d0812" stroke="#25101a" stroke-width="1.5" />
    <text x="64" y="144" fill="#ffffff" font-size="15" font-weight="800">GLOBAL ATTACK VECTOR MAP</text>
    <text x="64" y="162" fill="#64748b" font-size="11">Real-time DDoS &amp; botnet telemetry geolocation</text>

    <g transform="translate(64, 180)">
      <!-- World map dot grid -->
      ${Array.from({ length: 22 }, (_, col) =>
        Array.from({ length: 12 }, (_, row) => {
          const dotX = col * 46 + 15;
          const dotY = row * 26 + 10;
          return `<circle cx="${dotX}" cy="${dotY}" r="1.5" fill="#331c28" />`;
        }).join('')
      ).join('')}

      <!-- Attack Arcs -->
      ${attackArcs.map((arc, i) => {
        const mx = (arc.x1 + arc.x2) / 2;
        const my = Math.min(arc.y1, arc.y2) - 60;
        const px = arc.x1 + (arc.x2 - arc.x1) * pulseTravel;
        const py = arc.y1 + (arc.y2 - arc.y1) * pulseTravel - Math.sin(pulseTravel * Math.PI) * 60;
        return `
          <g>
            <path d="M ${arc.x1} ${arc.y1} Q ${mx} ${my} ${arc.x2} ${arc.y2}" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6" />
            <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${accent}" filter="url(#glow-cyber)" />
            <circle cx="${arc.x1}" cy="${arc.y1}" r="6" fill="${accent}" opacity="0.8" />
            <circle cx="${arc.x2}" cy="${arc.y2}" r="8" fill="none" stroke="${green}" stroke-width="2" />
            <circle cx="${arc.x2}" cy="${arc.y2}" r="3" fill="${green}" />
          </g>
        `;
      }).join('')}
    </g>

    <!-- Center Right: Shield Radar and Firewall Panel -->
    <rect x="1180" y="110" width="700" height="520" rx="10" fill="#0d0812" stroke="#25101a" stroke-width="1.5" />
    <text x="1204" y="144" fill="#ffffff" font-size="15" font-weight="800">PERIMETER DEFENSE RADAR</text>
    <text x="1204" y="162" fill="#64748b" font-size="11">Active IDS/IPS deep-packet inspection shields</text>

    <!-- Radar Circle with Rotating Scan Line -->
    <g transform="translate(1360, 320)">
      <circle cx="0" cy="0" r="120" fill="#12060f" stroke="#331c28" stroke-width="1.5" />
      <circle cx="0" cy="0" r="80" fill="none" stroke="#331c28" stroke-width="1" stroke-dasharray="3 3" />
      <circle cx="0" cy="0" r="40" fill="none" stroke="#331c28" stroke-width="1" />
      <line x1="-120" y1="0" x2="120" y2="0" stroke="#331c28" stroke-width="1" />
      <line x1="0" y1="-120" x2="0" y2="120" stroke="#331c28" stroke-width="1" />
      
      <!-- Shield Glyph at Center -->
      <path d="M 0 -24 L 20 -10 L 20 12 L 0 24 L -20 12 L -20 -10 Z" fill="#1e0a16" stroke="${green}" stroke-width="2" />

      <!-- Rotating Radar Beam -->
      <g transform="rotate(${radarRot.toFixed(1)})">
        <line x1="0" y1="0" x2="120" y2="0" stroke="${green}" stroke-width="2.5" filter="url(#glow-cyber)" />
        <polygon points="0,0 120,-30 120,0" fill="${green}" fill-opacity="0.15" />
      </g>
    </g>

    <!-- Firewall Toggles and Metrics (Right of Radar) -->
    <g transform="translate(1530, 220)">
      <text x="0" y="0" fill="#cbd5e1" font-size="12" font-weight="700">FIREWALL ZONES</text>
      ${[
        { name: 'ZONE ALPHA (DMZ)', state: 'ARMED', active: true },
        { name: 'ZONE BETA (API)', state: 'ARMED', active: true },
        { name: 'ZONE GAMMA (DB)', state: 'ISOLATED', active: false },
        { name: 'HONEYPOT NET', state: 'ACTIVE', active: true }
      ].map((zone, idx) => {
        const zy = 24 + idx * 44;
        return `
          <g transform="translate(0, ${zy})">
            <rect x="0" y="0" width="310" height="34" rx="6" fill="#170a13" stroke="#2b121e" stroke-width="1" />
            <text x="12" y="21" fill="#cbd5e1" font-size="11" font-weight="600">${zone.name}</text>
            <rect x="220" y="7" width="80" height="20" rx="4" fill="${zone.active ? green : accent}" fill-opacity="0.2" />
            <text x="260" y="21" fill="${zone.active ? green : accent}" font-size="10" font-weight="800" text-anchor="middle">${zone.state}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Left: Threat Log Table -->
    <rect x="40" y="650" width="1080" height="390" rx="10" fill="#0d0812" stroke="#25101a" stroke-width="1.5" />
    <text x="64" y="684" fill="#ffffff" font-size="14" font-weight="800">REAL-TIME INTRUSION LOG WIRE</text>
    <text x="64" y="702" fill="#64748b" font-size="11">Automated honeypot capture &amp; signature matching</text>

    <g transform="translate(64, 720)">
      ${threats.map((tRow, idx) => {
        const ry = idx * 46;
        const rowStagger = clamp((p - idx * 0.08) / 0.25, 0, 1);
        return `
          <g transform="translate(0, ${ry})" opacity="${(0.2 + 0.8 * rowStagger).toFixed(2)}">
            <rect x="0" y="0" width="1030" height="38" rx="6" fill="#13070f" stroke="#25101a" stroke-width="1" />
            <text x="14" y="24" fill="#64748b" font-size="11" font-family="monospace">${tRow.id}</text>
            <rect x="110" y="8" width="85" height="22" rx="4" fill="${tRow.color}" fill-opacity="0.2" />
            <text x="152" y="23" fill="${tRow.color}" font-size="10" font-weight="800" text-anchor="middle">${tRow.sev}</text>
            <text x="220" y="24" fill="#cbd5e1" font-size="12" font-weight="600">${tRow.type}</text>
            <text x="680" y="24" fill="#94a3b8" font-size="12" font-family="monospace">SRC: ${tRow.ip}</text>
            <text x="1000" y="24" fill="${green}" font-size="11" font-weight="700" text-anchor="end">BLOCKED</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Bottom Right: Encryption and Network Topology -->
    <rect x="1140" y="650" width="740" height="390" rx="10" fill="#0d0812" stroke="#25101a" stroke-width="1.5" />
    <text x="1164" y="684" fill="#ffffff" font-size="14" font-weight="800">ENCRYPTION &amp; SYSTEM INTEGRITY</text>
    <text x="1164" y="702" fill="#64748b" font-size="11">Hardware-level TPM secure enclave attestation</text>

    <!-- Encryption Progress Bar -->
    <g transform="translate(1164, 730)">
      <text x="0" y="0" fill="#cbd5e1" font-size="12" font-weight="700">QUANTUM-RESISTANT VAULT RE-ENCRYPTION</text>
      <text x="690" y="0" fill="${green}" font-size="13" font-family="monospace" font-weight="800" text-anchor="end">${encVal}%</text>
      <rect x="0" y="12" width="690" height="18" rx="6" fill="#1b0914" />
      <rect x="0" y="12" width="${(690 * (parseFloat(encVal) / 100)).toFixed(1)}" height="18" rx="6" fill="${green}" filter="url(#glow-cyber)" />
    </g>

    <!-- Network Topology Grid -->
    <g transform="translate(1164, 800)">
      <text x="0" y="0" fill="#cbd5e1" font-size="12" font-weight="700">CORE NODE BACKBONE</text>
      ${[
        { name: 'EDGE-PROXY-01', lat: '0.8ms', status: 'SYNCHRONIZED' },
        { name: 'KUBE-AUTH-MESH', lat: '1.2ms', status: 'SYNCHRONIZED' },
        { name: 'VAULT-HSM-CLUSTER', lat: '0.4ms', status: 'ENCLAVE ACTIVE' }
      ].map((node, idx) => {
        const ny = 16 + idx * 56;
        return `
          <g transform="translate(0, ${ny})">
            <rect x="0" y="0" width="690" height="46" rx="6" fill="#140811" stroke="#25101a" stroke-width="1" />
            <circle cx="24" cy="23" r="6" fill="${green}" filter="url(#glow-cyber)" />
            <text x="44" y="27" fill="#ffffff" font-size="12" font-weight="700">${node.name}</text>
            <text x="320" y="27" fill="#64748b" font-size="11" font-family="monospace">RTT: ${node.lat}</text>
            <rect x="540" y="13" width="130" height="20" rx="4" fill="${green}" fill-opacity="0.15" />
            <text x="605" y="27" fill="${green}" font-size="10" font-weight="800" text-anchor="middle">${node.status}</text>
          </g>
        `;
      }).join('')}
    </g>
  </g>
</svg>`;
  }
};
