export interface SvgSample {
  id: string;
  name: string;
  category: string;
  description: string;
  recommendedAnimation: 'draw-on' | 'pulse' | 'fade-in' | 'zoom-in' | 'rotate-in' | 'slide-up' | 'pulse-loop' | 'spin-continuous';
  code: string;
}

export const SAMPLE_SVGS: SvgSample[] = [
  {
    id: 'rocket-stroke',
    name: 'Cosmic Rocket & Orbit',
    category: 'Draw-style Stroke Logo',
    description: 'Crisp vector strokes, orbit paths, and constellation stars designed specifically for the draw-on animation effect.',
    recommendedAnimation: 'draw-on',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" fill="none" stroke="#6366f1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <!-- Orbit Path -->
  <ellipse cx="200" cy="200" rx="145" ry="50" stroke="#475569" stroke-width="2.5" stroke-dasharray="8 8" transform="rotate(-28 200 200)" />
  
  <!-- Rocket Hull Outer -->
  <path d="M200 55 C235 110 245 185 232 250 L168 250 C155 185 165 110 200 55 Z" stroke="#818cf8" stroke-width="4.5" />
  
  <!-- Nose Cone Accent -->
  <path d="M185 105 C195 90 205 90 215 105" stroke="#38bdf8" stroke-width="3" />
  
  <!-- Cabin Porthole -->
  <circle cx="200" cy="150" r="22" stroke="#38bdf8" stroke-width="4" />
  <circle cx="200" cy="150" r="10" stroke="#38bdf8" stroke-width="2.5" />
  
  <!-- Left & Right Stabilizer Fins -->
  <path d="M168 210 L125 260 L168 250 Z" stroke="#a855f7" stroke-width="4" />
  <path d="M232 210 L275 260 L232 250 Z" stroke="#a855f7" stroke-width="4" />
  
  <!-- Center Rudder Spine -->
  <path d="M200 210 L200 250" stroke="#818cf8" stroke-width="3" />
  
  <!-- Thruster Nozzle & Exhaust Flame -->
  <path d="M182 252 L218 252 L212 262 L188 262 Z" stroke="#64748b" stroke-width="3" />
  <path d="M184 264 C184 298 200 330 200 330 C200 330 216 298 216 264 Z" stroke="#f43f5e" stroke-width="3.5" />
  <path d="M192 264 C192 284 200 304 200 304 C200 304 208 284 208 264 Z" stroke="#fbbf24" stroke-width="3" />
  
  <!-- Sparkle Stars -->
  <path d="M95 105 L100 120 L115 125 L100 130 L95 145 L90 130 L75 125 L90 120 Z" stroke="#fbbf24" stroke-width="2.5" />
  <path d="M295 85 L298 95 L308 98 L298 101 L295 111 L292 101 L282 98 L292 95 Z" stroke="#38bdf8" stroke-width="2.5" />
  <path d="M315 270 L318 277 L325 280 L318 283 L315 290 L312 283 L305 280 L312 277 Z" stroke="#a855f7" stroke-width="2" />
  
  <!-- Cosmic Dust Accents -->
  <circle cx="80" cy="240" r="3" fill="#38bdf8" stroke="none" />
  <circle cx="125" cy="70" r="2.5" fill="#fbbf24" stroke="none" />
  <circle cx="330" cy="180" r="2.5" fill="#f43f5e" stroke="none" />
</svg>`
  },
  {
    id: 'geometric-abstract',
    name: 'Bauhaus Geometric Set',
    category: 'Colorful Shape Composition',
    description: 'Vibrant overlapping geometric shapes, gradients, and rotating elements with balanced color distribution.',
    recommendedAnimation: 'zoom-in',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="gradIndigoCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="gradRoseOrange" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f43f5e" />
      <stop offset="100%" stop-color="#fb923c" />
    </linearGradient>
  </defs>
  
  <!-- Subtle Framing Ring -->
  <circle cx="250" cy="250" r="195" fill="none" stroke="#334155" stroke-width="3" stroke-dasharray="10 8" opacity="0.5" />
  
  <!-- Large Geometric Shapes -->
  <polygon points="120,380 250,110 380,380" fill="url(#gradIndigoCyan)" opacity="0.9" />
  <circle cx="250" cy="250" r="100" fill="url(#gradRoseOrange)" opacity="0.88" />
  <rect x="200" y="200" width="160" height="160" rx="28" fill="#10b981" opacity="0.8" transform="rotate(45 280 280)" />
  
  <!-- Floating Accents -->
  <circle cx="150" cy="170" r="32" fill="#fbbf24" />
  <polygon points="360,150 385,200 335,200" fill="#ec4899" />
  <circle cx="360" cy="340" r="22" fill="#38bdf8" />
  
  <!-- Studio Axis Lines -->
  <line x1="80" y1="250" x2="420" y2="250" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round" opacity="0.3" />
  <line x1="250" y1="80" x2="250" y2="420" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round" opacity="0.3" />
</svg>`
  },
  {
    id: 'badge-hello',
    name: 'Neon "HELLO" Badge',
    category: 'Vibrant Typographic Badge',
    description: 'Polished rounded emblem with bold lettering, ambient drop shadow, and starry framing.',
    recommendedAnimation: 'slide-up',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 300" width="460" height="300">
  <defs>
    <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#db2777" />
    </linearGradient>
    <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>
  
  <!-- Outer Rounded Capsule Card -->
  <rect x="30" y="30" width="400" height="240" rx="40" fill="url(#badgeGradient)" filter="url(#badgeShadow)" />
  
  <!-- Inner Dashed Border Guide -->
  <rect x="46" y="46" width="368" height="208" rx="28" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="10 6" opacity="0.4" />
  
  <!-- Corner Star Decors -->
  <circle cx="85" cy="80" r="5" fill="#fde047" />
  <circle cx="375" cy="80" r="5" fill="#fde047" />
  <circle cx="85" cy="220" r="5" fill="#fde047" />
  <circle cx="375" cy="220" r="5" fill="#fde047" />
  
  <!-- Main HELLO Typography -->
  <text x="230" y="152" text-anchor="middle" dominant-baseline="middle" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="76" font-weight="900" fill="#ffffff" letter-spacing="8">HELLO</text>
  
  <!-- Badge Subtitle -->
  <text x="230" y="196" text-anchor="middle" dominant-baseline="middle" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#ffffff" letter-spacing="5" opacity="0.9">VECTOR STUDIO</text>
</svg>`
  },
  {
    id: 'orbit-spin-sample',
    name: 'Orbiting Spheres Ring (1080p)',
    category: 'Full HD Continuous Spin',
    description: 'Precision-centered constellation ring at 1920x1080 on vibrant lime canvas, ideal for 360° continuous spin animation testing.',
    recommendedAnimation: 'spin-continuous',
    code: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#00ff00"/><g fill="#1e3a8a"><circle cx="960" cy="280" r="34"/><circle cx="1178" cy="350" r="30"/><circle cx="1260" cy="540" r="26"/><circle cx="1178" cy="730" r="22"/><circle cx="960" cy="800" r="18"/><circle cx="742" cy="730" r="14"/><circle cx="660" cy="540" r="10"/><circle cx="742" cy="350" r="6"/></g></svg>`
  },
  {
    id: 'green-screen-circle',
    name: 'Green Screen Ring (1080p)',
    category: 'Pure #00FF00 Edge-to-Edge Rect',
    description: '1920x1080 SVG with native pure #00FF00 background rect and centered stroke circle, tests "From my SVG code" mode.',
    recommendedAnimation: 'draw-on',
    code: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#00ff00"/><circle cx="960" cy="540" r="200" fill="none" stroke="#ffffff" stroke-width="40"/></svg>`
  },
  {
    id: 'pixel-loader-sample',
    name: 'Pixel Loader (1080p)',
    category: 'Full HD Pixel Loader with Green Screen',
    description: '1920x1080 SVG with #00FF00 background rect, three animated pixel dots and pixel-font LOADING label, ideal for Pulse opacity animation testing.',
    recommendedAnimation: 'pulse',
    code: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#00ff00"/><rect x="736" y="360" width="28" height="28" fill="#141414"/><rect x="764" y="360" width="28" height="28" fill="#141414"/><rect x="792" y="360" width="28" height="28" fill="#141414"/><rect x="820" y="360" width="28" height="28" fill="#141414"/><rect x="736" y="388" width="28" height="28" fill="#141414"/><rect x="764" y="388" width="28" height="28" fill="#141414"/><rect x="792" y="388" width="28" height="28" fill="#141414"/><rect x="820" y="388" width="28" height="28" fill="#141414"/><rect x="736" y="416" width="28" height="28" fill="#141414"/><rect x="764" y="416" width="28" height="28" fill="#141414"/><rect x="792" y="416" width="28" height="28" fill="#141414"/><rect x="820" y="416" width="28" height="28" fill="#141414"/><rect x="736" y="444" width="28" height="28" fill="#141414"/><rect x="764" y="444" width="28" height="28" fill="#141414"/><rect x="792" y="444" width="28" height="28" fill="#141414"/><rect x="820" y="444" width="28" height="28" fill="#141414"/><rect x="904" y="360" width="28" height="28" fill="#141414"/><rect x="932" y="360" width="28" height="28" fill="#141414"/><rect x="960" y="360" width="28" height="28" fill="#141414"/><rect x="988" y="360" width="28" height="28" fill="#141414"/><rect x="904" y="388" width="28" height="28" fill="#141414"/><rect x="932" y="388" width="28" height="28" fill="#141414"/><rect x="960" y="388" width="28" height="28" fill="#141414"/><rect x="988" y="388" width="28" height="28" fill="#141414"/><rect x="904" y="416" width="28" height="28" fill="#141414"/><rect x="932" y="416" width="28" height="28" fill="#141414"/><rect x="960" y="416" width="28" height="28" fill="#141414"/><rect x="988" y="416" width="28" height="28" fill="#141414"/><rect x="904" y="444" width="28" height="28" fill="#141414"/><rect x="932" y="444" width="28" height="28" fill="#141414"/><rect x="960" y="444" width="28" height="28" fill="#141414"/><rect x="988" y="444" width="28" height="28" fill="#141414"/><rect x="1072" y="360" width="28" height="28" fill="#141414"/><rect x="1100" y="360" width="28" height="28" fill="#141414"/><rect x="1128" y="360" width="28" height="28" fill="#141414"/><rect x="1156" y="360" width="28" height="28" fill="#141414"/><rect x="1072" y="388" width="28" height="28" fill="#141414"/><rect x="1100" y="388" width="28" height="28" fill="#141414"/><rect x="1128" y="388" width="28" height="28" fill="#141414"/><rect x="1156" y="388" width="28" height="28" fill="#141414"/><rect x="1072" y="416" width="28" height="28" fill="#141414"/><rect x="1100" y="416" width="28" height="28" fill="#141414"/><rect x="1128" y="416" width="28" height="28" fill="#141414"/><rect x="1156" y="416" width="28" height="28" fill="#141414"/><rect x="1072" y="444" width="28" height="28" fill="#141414"/><rect x="1100" y="444" width="28" height="28" fill="#141414"/><rect x="1128" y="444" width="28" height="28" fill="#141414"/><rect x="1156" y="444" width="28" height="28" fill="#141414"/><rect x="345" y="620" width="30" height="30" fill="#141414"/><rect x="345" y="650" width="30" height="30" fill="#141414"/><rect x="345" y="680" width="30" height="30" fill="#141414"/><rect x="345" y="710" width="30" height="30" fill="#141414"/><rect x="345" y="740" width="30" height="30" fill="#141414"/><rect x="345" y="770" width="30" height="30" fill="#141414"/><rect x="345" y="800" width="30" height="30" fill="#141414"/><rect x="375" y="800" width="30" height="30" fill="#141414"/><rect x="405" y="800" width="30" height="30" fill="#141414"/><rect x="435" y="800" width="30" height="30" fill="#141414"/><rect x="465" y="800" width="30" height="30" fill="#141414"/><rect x="555" y="620" width="30" height="30" fill="#141414"/><rect x="585" y="620" width="30" height="30" fill="#141414"/><rect x="615" y="620" width="30" height="30" fill="#141414"/><rect x="525" y="650" width="30" height="30" fill="#141414"/><rect x="645" y="650" width="30" height="30" fill="#141414"/><rect x="525" y="680" width="30" height="30" fill="#141414"/><rect x="645" y="680" width="30" height="30" fill="#141414"/><rect x="525" y="710" width="30" height="30" fill="#141414"/><rect x="645" y="710" width="30" height="30" fill="#141414"/><rect x="525" y="740" width="30" height="30" fill="#141414"/><rect x="645" y="740" width="30" height="30" fill="#141414"/><rect x="525" y="770" width="30" height="30" fill="#141414"/><rect x="645" y="770" width="30" height="30" fill="#141414"/><rect x="555" y="800" width="30" height="30" fill="#141414"/><rect x="585" y="800" width="30" height="30" fill="#141414"/><rect x="615" y="800" width="30" height="30" fill="#141414"/><rect x="735" y="620" width="30" height="30" fill="#141414"/><rect x="765" y="620" width="30" height="30" fill="#141414"/><rect x="795" y="620" width="30" height="30" fill="#141414"/><rect x="705" y="650" width="30" height="30" fill="#141414"/><rect x="825" y="650" width="30" height="30" fill="#141414"/><rect x="705" y="680" width="30" height="30" fill="#141414"/><rect x="825" y="680" width="30" height="30" fill="#141414"/><rect x="705" y="710" width="30" height="30" fill="#141414"/><rect x="735" y="710" width="30" height="30" fill="#141414"/><rect x="765" y="710" width="30" height="30" fill="#141414"/><rect x="795" y="710" width="30" height="30" fill="#141414"/><rect x="825" y="710" width="30" height="30" fill="#141414"/><rect x="705" y="740" width="30" height="30" fill="#141414"/><rect x="825" y="740" width="30" height="30" fill="#141414"/><rect x="705" y="770" width="30" height="30" fill="#141414"/><rect x="825" y="770" width="30" height="30" fill="#141414"/><rect x="705" y="800" width="30" height="30" fill="#141414"/><rect x="825" y="800" width="30" height="30" fill="#141414"/><rect x="885" y="620" width="30" height="30" fill="#141414"/><rect x="915" y="620" width="30" height="30" fill="#141414"/><rect x="945" y="620" width="30" height="30" fill="#141414"/><rect x="975" y="620" width="30" height="30" fill="#141414"/><rect x="885" y="650" width="30" height="30" fill="#141414"/><rect x="1005" y="650" width="30" height="30" fill="#141414"/><rect x="885" y="680" width="30" height="30" fill="#141414"/><rect x="1005" y="680" width="30" height="30" fill="#141414"/><rect x="885" y="710" width="30" height="30" fill="#141414"/><rect x="1005" y="710" width="30" height="30" fill="#141414"/><rect x="885" y="740" width="30" height="30" fill="#141414"/><rect x="1005" y="740" width="30" height="30" fill="#141414"/><rect x="885" y="770" width="30" height="30" fill="#141414"/><rect x="1005" y="770" width="30" height="30" fill="#141414"/><rect x="885" y="800" width="30" height="30" fill="#141414"/><rect x="915" y="800" width="30" height="30" fill="#141414"/><rect x="945" y="800" width="30" height="30" fill="#141414"/><rect x="975" y="800" width="30" height="30" fill="#141414"/><rect x="1065" y="620" width="30" height="30" fill="#141414"/><rect x="1095" y="620" width="30" height="30" fill="#141414"/><rect x="1125" y="620" width="30" height="30" fill="#141414"/><rect x="1155" y="620" width="30" height="30" fill="#141414"/><rect x="1185" y="620" width="30" height="30" fill="#141414"/><rect x="1125" y="650" width="30" height="30" fill="#141414"/><rect x="1125" y="680" width="30" height="30" fill="#141414"/><rect x="1125" y="710" width="30" height="30" fill="#141414"/><rect x="1125" y="740" width="30" height="30" fill="#141414"/><rect x="1125" y="770" width="30" height="30" fill="#141414"/><rect x="1065" y="800" width="30" height="30" fill="#141414"/><rect x="1095" y="800" width="30" height="30" fill="#141414"/><rect x="1125" y="800" width="30" height="30" fill="#141414"/><rect x="1155" y="800" width="30" height="30" fill="#141414"/><rect x="1185" y="800" width="30" height="30" fill="#141414"/><rect x="1245" y="620" width="30" height="30" fill="#141414"/><rect x="1365" y="620" width="30" height="30" fill="#141414"/><rect x="1245" y="650" width="30" height="30" fill="#141414"/><rect x="1275" y="650" width="30" height="30" fill="#141414"/><rect x="1365" y="650" width="30" height="30" fill="#141414"/><rect x="1245" y="680" width="30" height="30" fill="#141414"/><rect x="1275" y="680" width="30" height="30" fill="#141414"/><rect x="1365" y="680" width="30" height="30" fill="#141414"/><rect x="1245" y="710" width="30" height="30" fill="#141414"/><rect x="1305" y="710" width="30" height="30" fill="#141414"/><rect x="1365" y="710" width="30" height="30" fill="#141414"/><rect x="1245" y="740" width="30" height="30" fill="#141414"/><rect x="1335" y="740" width="30" height="30" fill="#141414"/><rect x="1365" y="740" width="30" height="30" fill="#141414"/><rect x="1245" y="770" width="30" height="30" fill="#141414"/><rect x="1335" y="770" width="30" height="30" fill="#141414"/><rect x="1365" y="770" width="30" height="30" fill="#141414"/><rect x="1245" y="800" width="30" height="30" fill="#141414"/><rect x="1365" y="800" width="30" height="30" fill="#141414"/><rect x="1455" y="620" width="30" height="30" fill="#141414"/><rect x="1485" y="620" width="30" height="30" fill="#141414"/><rect x="1515" y="620" width="30" height="30" fill="#141414"/><rect x="1425" y="650" width="30" height="30" fill="#141414"/><rect x="1545" y="650" width="30" height="30" fill="#141414"/><rect x="1425" y="680" width="30" height="30" fill="#141414"/><rect x="1425" y="710" width="30" height="30" fill="#141414"/><rect x="1485" y="710" width="30" height="30" fill="#141414"/><rect x="1515" y="710" width="30" height="30" fill="#141414"/><rect x="1545" y="710" width="30" height="30" fill="#141414"/><rect x="1425" y="740" width="30" height="30" fill="#141414"/><rect x="1545" y="740" width="30" height="30" fill="#141414"/><rect x="1425" y="770" width="30" height="30" fill="#141414"/><rect x="1545" y="770" width="30" height="30" fill="#141414"/><rect x="1455" y="800" width="30" height="30" fill="#141414"/><rect x="1485" y="800" width="30" height="30" fill="#141414"/><rect x="1515" y="800" width="30" height="30" fill="#141414"/><rect x="1545" y="800" width="30" height="30" fill="#141414"/></svg>`
  }
];
