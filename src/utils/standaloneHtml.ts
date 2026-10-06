/**
 * Standalone Single-File HTML Generator
 * Bundles the WebCodecs + mp4-muxer engine with MediaRecorder warm-up fallback
 * into a 100% self-contained .html file runnable directly in Chrome.
 */

export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SVG to Video Studio (Offline Standalone)</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    code, pre, textarea, .font-mono { font-family: 'JetBrains Mono', monospace; }
    .checkerboard {
      background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%),
                        linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #1e293b 75%),
                        linear-gradient(-45deg, transparent 75%, #1e293b 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
  </style>
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen flex flex-col">
  <!-- Top Bar -->
  <header class="border-b border-neutral-800 bg-neutral-900/80 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h1 class="text-base font-bold text-white tracking-tight">SVG to Video Studio</h1>
        <p class="text-xs text-neutral-400">WebCodecs Frame-Accurate Pipeline • Drift-Free</p>
      </div>
    </div>
    <div class="flex items-center gap-2 text-xs text-neutral-400">
      <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
      <span id="formatBadge">Detecting engine...</span>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
    <!-- Left Column: Code Editor -->
    <div class="lg:col-span-5 border-r border-neutral-800 flex flex-col bg-neutral-900/50">
      <div class="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-neutral-300 uppercase tracking-wider">SVG Source Code</span>
          <span id="lineCountBadge" class="text-xs text-neutral-500">0 lines</span>
        </div>
        <div class="flex items-center gap-2">
          <button id="sampleBtn" class="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition">
            Load Sample
          </button>
          <button id="clearBtn" class="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition">
            Clear
          </button>
        </div>
      </div>
      <div class="flex-1 flex overflow-hidden relative">
        <div id="lineNumbers" class="w-12 bg-neutral-950/80 border-r border-neutral-800 py-3 text-right pr-3 font-mono text-xs text-neutral-600 select-none overflow-hidden">
          1
        </div>
        <textarea id="svgEditor" spellcheck="false" class="flex-1 bg-transparent p-3 font-mono text-xs text-neutral-200 outline-none resize-none leading-relaxed overflow-auto selection:bg-indigo-600/30" placeholder="Paste your SVG code here (<svg>...</svg>)..."></textarea>
      </div>
      <div id="validationBanner" class="hidden p-3 bg-red-950/60 border-t border-red-800/80 text-xs text-red-200 flex items-start gap-2">
        <span class="font-semibold shrink-0">Invalid SVG:</span>
        <span id="validationErrorText"></span>
      </div>
    </div>

    <!-- Center/Right: Preview & Controls -->
    <div class="lg:col-span-7 flex flex-col overflow-y-auto">
      <!-- Live Preview Pane -->
      <div class="p-6 border-b border-neutral-800 flex flex-col items-center justify-center min-h-[380px] bg-neutral-950/60 relative">
        <div class="absolute top-4 left-4 flex items-center gap-2">
          <span class="text-xs font-semibold text-neutral-400">Live Stage Preview (Drift-Compensated)</span>
        </div>

        <div id="previewContainer" class="w-full max-w-md h-72 rounded-xl border border-neutral-800 flex items-center justify-center p-4 relative overflow-hidden transition-all shadow-inner">
          <canvas id="previewCanvas" class="max-w-full max-h-full object-contain rounded"></canvas>
        </div>

        <!-- Playback Scrubber for preview -->
        <div class="w-full max-w-md mt-4 flex items-center gap-3">
          <button id="togglePlayBtn" class="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition border border-neutral-700">
            <span id="playBtnText">Play Preview</span>
          </button>
          <input id="timelineScrubber" type="range" min="0" max="100" value="0" class="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg">
          <span id="timeDisplay" class="text-xs font-mono text-neutral-400 w-16 text-right">0.0s / 5s</span>
        </div>
      </div>

      <!-- Controls Panel -->
      <div class="p-6 bg-neutral-900/30 flex-1 flex flex-col gap-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Animation Style & Rotations -->
          <div>
            <label class="block text-xs font-medium text-neutral-400 mb-1.5">Animation Style</label>
            <div class="flex items-center gap-2">
              <select id="animStyleSelect" class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
                <option value="draw-on">Draw-on (strokes draw themselves)</option>
                <option value="pulse">Pulse</option>
                <option value="progress">Progress</option>
                <option value="fade-in">Fade in</option>
                <option value="zoom-in" selected>Zoom in</option>
                <option value="rotate-in">Rotate in</option>
                <option value="slide-up">Slide up</option>
                <option value="pulse-loop">Pulse loop</option>
                <option value="spin-continuous">Spin (continuous)</option>
              </select>
              <div id="pulsesWrapper" class="hidden flex items-center gap-1.5 shrink-0 bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5">
                <label for="pulsesInput" class="text-[11px] text-neutral-400 whitespace-nowrap">Pulses:</label>
                <input id="pulsesInput" type="number" min="1" max="10" value="4" class="w-10 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-xs text-white text-center font-mono">
              </div>
              <div id="rotationsWrapper" class="hidden flex items-center gap-1.5 shrink-0 bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5">
                <label for="rotationsInput" class="text-[11px] text-neutral-400 whitespace-nowrap">Rotations:</label>
                <input id="rotationsInput" type="number" min="1" max="10" value="2" class="w-10 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-xs text-white text-center font-mono">
              </div>
            </div>
          </div>

          <!-- Duration -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-medium text-neutral-400">Duration (seconds)</label>
              <span id="durationLabel" class="text-xs font-mono text-indigo-400">5s</span>
            </div>
            <div class="flex items-center gap-3">
              <input id="durationRange" type="range" min="1" max="30" value="5" class="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-neutral-800 rounded">
              <input id="durationNumber" type="number" min="1" max="30" value="5" class="w-14 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white text-center">
            </div>
          </div>

          <!-- Resolution -->
          <div>
            <label class="block text-xs font-medium text-neutral-400 mb-1.5">Resolution</label>
            <select id="resSelect" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
              <option value="1920x1080">1080p (1920 × 1080)</option>
              <option value="1280x720" selected>720p (1280 × 720)</option>
              <option value="1080x1080">1:1 Square (1080 × 1080)</option>
              <option value="1080x1920">9:16 Vertical (1080 × 1920)</option>
            </select>
          </div>

          <!-- Frame Rate -->
          <div>
            <label class="block text-xs font-medium text-neutral-400 mb-1.5">Frame Rate</label>
            <select id="fpsSelect" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
              <option value="24">24 fps (Cinematic)</option>
              <option value="30" selected>30 fps (Standard)</option>
              <option value="60">60 fps (Smooth)</option>
            </select>
          </div>

          <!-- Background Settings -->
          <div class="md:col-span-2 flex flex-col gap-2.5 p-3 bg-neutral-800/40 rounded-lg border border-neutral-800">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-neutral-300">Background source</label>
              <select id="bgSourceSelect" class="bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer">
                <option value="svg" selected>From my SVG code</option>
                <option value="custom">Custom color</option>
              </select>
            </div>
            <div id="customBgControls" class="opacity-35 pointer-events-none flex items-center justify-between pt-2 border-t border-neutral-800 transition-opacity">
              <div class="flex items-center gap-3">
                <label class="text-xs text-neutral-400">Color:</label>
                <input id="bgColorPicker" type="color" value="#0f172a" disabled class="w-6 h-6 rounded border-0 cursor-pointer bg-transparent disabled:opacity-40">
                <span id="bgColorHex" class="text-xs font-mono text-neutral-400">#0f172a</span>
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="bgTransparentCheck" type="checkbox" disabled class="accent-indigo-500 w-4 h-4 rounded disabled:opacity-40">
                <span class="text-xs text-neutral-300">Transparent</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Render Controls & Two-Phase Progress Bar -->
        <div class="pt-4 border-t border-neutral-800 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <button id="renderBtn" class="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer">
              <span>Render Video</span>
            </button>
            <button id="downloadBtn" disabled class="py-3 px-6 bg-neutral-800 text-neutral-500 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-not-allowed">
              <span>Download</span>
            </button>
          </div>

          <!-- Two-Phase Progress Section -->
          <div id="progressSection" class="hidden flex-col gap-2.5 p-4 bg-neutral-900 rounded-xl border border-neutral-800 shadow-md">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span id="phaseBadge" class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-900 text-indigo-200">
                  Phase 1 of 2: Preparing frames
                </span>
                <span id="statusText" class="text-neutral-300 font-medium">Preparing frame 1 of 150...</span>
              </div>
              <span id="percentText" class="text-indigo-400 font-mono font-bold">0%</span>
            </div>
            <div class="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div id="progressBar" class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-75 w-0"></div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-neutral-500">
              <span id="substatusText">Pre-rendering SVG bitmaps into memory</span>
              <button id="cancelRenderBtn" class="text-red-400 hover:text-red-300 transition">Cancel</button>
            </div>
          </div>

          <!-- Video Player Output -->
          <div id="videoOutputSection" class="hidden flex-col gap-3 p-4 bg-neutral-900 rounded-xl border border-neutral-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-white">Rendered Video Output</span>
              <span id="videoMetaBadge" class="text-[11px] text-neutral-400 font-mono"></span>
            </div>
            <video id="renderedPlayer" controls loop playsinline class="w-full max-h-72 rounded-lg bg-black object-contain"></video>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script type="module">
    // Load mp4-muxer from ESM CDN
    let Muxer = null;
    let ArrayBufferTarget = null;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5/build/mp4-muxer.mjs');
      Muxer = mod.Muxer;
      ArrayBufferTarget = mod.ArrayBufferTarget;
    } catch (err) {
      console.warn('Failed to load mp4-muxer from CDN, fallback to MediaRecorder with warm-up fix:', err);
    }

    const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined' && Muxer !== null;
    const formatBadge = document.getElementById('formatBadge');
    if (hasWebCodecs) {
      formatBadge.textContent = 'WebCodecs MP4 (Frame-Accurate)';
    } else {
      formatBadge.textContent = 'MediaRecorder Fallback (Warmed-Up)';
    }

    // Embedded Sample SVGs
    const SAMPLES = [
      {
        name: 'Rocket',
        code: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" fill="none" stroke="#6366f1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="200" cy="200" rx="145" ry="50" stroke="#475569" stroke-width="2.5" stroke-dasharray="8 8" transform="rotate(-28 200 200)" />
  <path d="M200 55 C235 110 245 185 232 250 L168 250 C155 185 165 110 200 55 Z" stroke="#818cf8" stroke-width="4.5" />
  <circle cx="200" cy="150" r="22" stroke="#38bdf8" stroke-width="4" />
  <path d="M168 210 L125 260 L168 250 Z" stroke="#a855f7" stroke-width="4" />
  <path d="M232 210 L275 260 L232 250 Z" stroke="#a855f7" stroke-width="4" />
  <path d="M184 264 C184 298 200 330 200 330 C200 330 216 298 216 264 Z" stroke="#f43f5e" stroke-width="3.5" />
  <circle cx="80" cy="240" r="3" fill="#38bdf8" stroke="none" />
  <circle cx="330" cy="180" r="2.5" fill="#f43f5e" stroke="none" />
</svg>\`
      },
      {
        name: 'Geometric',
        code: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="190" fill="none" stroke="#334155" stroke-width="3" stroke-dasharray="10 8" opacity="0.6" />
  <polygon points="120,380 250,110 380,380" fill="url(#g1)" opacity="0.9" />
  <circle cx="250" cy="250" r="95" fill="#f43f5e" opacity="0.85" />
  <rect x="200" y="200" width="160" height="160" rx="28" fill="#10b981" opacity="0.8" transform="rotate(45 280 280)" />
</svg>\`
      },
      {
        name: 'Badge',
        code: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 300" width="460" height="300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#db2777"/>
    </linearGradient>
  </defs>
  <rect x="30" y="30" width="400" height="240" rx="36" fill="url(#bg)"/>
  <rect x="46" y="46" width="368" height="208" rx="26" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="10 6" opacity="0.4"/>
  <text x="230" y="155" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="74" font-weight="900" fill="#ffffff" letter-spacing="8">HELLO</text>
  <text x="230" y="198" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#ffffff" letter-spacing="5" opacity="0.9">VECTOR STUDIO</text>
</svg>\`
      },
      {
        name: 'Orbit Spheres',
        code: \`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#00ff00"/><g fill="#1e3a8a"><circle cx="960" cy="280" r="34"/><circle cx="1178" cy="350" r="30"/><circle cx="1260" cy="540" r="26"/><circle cx="1178" cy="730" r="22"/><circle cx="960" cy="800" r="18"/><circle cx="742" cy="730" r="14"/><circle cx="660" cy="540" r="10"/><circle cx="742" cy="350" r="6"/></g></svg>\`
      },
      {
        name: 'Green Screen Ring',
        code: \`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#00ff00"/><circle cx="960" cy="540" r="200" fill="none" stroke="#ffffff" stroke-width="40"/></svg>\`
      },
      {
        name: 'Pixel Loader',
        code: \`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#00ff00"/><rect x="736" y="360" width="28" height="28" fill="#141414"/><rect x="764" y="360" width="28" height="28" fill="#141414"/><rect x="792" y="360" width="28" height="28" fill="#141414"/><rect x="820" y="360" width="28" height="28" fill="#141414"/><rect x="736" y="388" width="28" height="28" fill="#141414"/><rect x="764" y="388" width="28" height="28" fill="#141414"/><rect x="792" y="388" width="28" height="28" fill="#141414"/><rect x="820" y="388" width="28" height="28" fill="#141414"/><rect x="736" y="416" width="28" height="28" fill="#141414"/><rect x="764" y="416" width="28" height="28" fill="#141414"/><rect x="792" y="416" width="28" height="28" fill="#141414"/><rect x="820" y="416" width="28" height="28" fill="#141414"/><rect x="736" y="444" width="28" height="28" fill="#141414"/><rect x="764" y="444" width="28" height="28" fill="#141414"/><rect x="792" y="444" width="28" height="28" fill="#141414"/><rect x="820" y="444" width="28" height="28" fill="#141414"/><rect x="904" y="360" width="28" height="28" fill="#141414"/><rect x="932" y="360" width="28" height="28" fill="#141414"/><rect x="960" y="360" width="28" height="28" fill="#141414"/><rect x="988" y="360" width="28" height="28" fill="#141414"/><rect x="904" y="388" width="28" height="28" fill="#141414"/><rect x="932" y="388" width="28" height="28" fill="#141414"/><rect x="960" y="388" width="28" height="28" fill="#141414"/><rect x="988" y="388" width="28" height="28" fill="#141414"/><rect x="904" y="416" width="28" height="28" fill="#141414"/><rect x="932" y="416" width="28" height="28" fill="#141414"/><rect x="960" y="416" width="28" height="28" fill="#141414"/><rect x="988" y="416" width="28" height="28" fill="#141414"/><rect x="904" y="444" width="28" height="28" fill="#141414"/><rect x="932" y="444" width="28" height="28" fill="#141414"/><rect x="960" y="444" width="28" height="28" fill="#141414"/><rect x="988" y="444" width="28" height="28" fill="#141414"/><rect x="1072" y="360" width="28" height="28" fill="#141414"/><rect x="1100" y="360" width="28" height="28" fill="#141414"/><rect x="1128" y="360" width="28" height="28" fill="#141414"/><rect x="1156" y="360" width="28" height="28" fill="#141414"/><rect x="1072" y="388" width="28" height="28" fill="#141414"/><rect x="1100" y="388" width="28" height="28" fill="#141414"/><rect x="1128" y="388" width="28" height="28" fill="#141414"/><rect x="1156" y="388" width="28" height="28" fill="#141414"/><rect x="1072" y="416" width="28" height="28" fill="#141414"/><rect x="1100" y="416" width="28" height="28" fill="#141414"/><rect x="1128" y="416" width="28" height="28" fill="#141414"/><rect x="1156" y="416" width="28" height="28" fill="#141414"/><rect x="1072" y="444" width="28" height="28" fill="#141414"/><rect x="1100" y="444" width="28" height="28" fill="#141414"/><rect x="1128" y="444" width="28" height="28" fill="#141414"/><rect x="1156" y="444" width="28" height="28" fill="#141414"/><rect x="345" y="620" width="30" height="30" fill="#141414"/><rect x="345" y="650" width="30" height="30" fill="#141414"/><rect x="345" y="680" width="30" height="30" fill="#141414"/><rect x="345" y="710" width="30" height="30" fill="#141414"/><rect x="345" y="740" width="30" height="30" fill="#141414"/><rect x="345" y="770" width="30" height="30" fill="#141414"/><rect x="345" y="800" width="30" height="30" fill="#141414"/><rect x="375" y="800" width="30" height="30" fill="#141414"/><rect x="405" y="800" width="30" height="30" fill="#141414"/><rect x="435" y="800" width="30" height="30" fill="#141414"/><rect x="465" y="800" width="30" height="30" fill="#141414"/><rect x="555" y="620" width="30" height="30" fill="#141414"/><rect x="585" y="620" width="30" height="30" fill="#141414"/><rect x="615" y="620" width="30" height="30" fill="#141414"/><rect x="525" y="650" width="30" height="30" fill="#141414"/><rect x="645" y="650" width="30" height="30" fill="#141414"/><rect x="525" y="680" width="30" height="30" fill="#141414"/><rect x="645" y="680" width="30" height="30" fill="#141414"/><rect x="525" y="710" width="30" height="30" fill="#141414"/><rect x="645" y="710" width="30" height="30" fill="#141414"/><rect x="525" y="740" width="30" height="30" fill="#141414"/><rect x="645" y="740" width="30" height="30" fill="#141414"/><rect x="525" y="770" width="30" height="30" fill="#141414"/><rect x="645" y="770" width="30" height="30" fill="#141414"/><rect x="555" y="800" width="30" height="30" fill="#141414"/><rect x="585" y="800" width="30" height="30" fill="#141414"/><rect x="615" y="800" width="30" height="30" fill="#141414"/><rect x="735" y="620" width="30" height="30" fill="#141414"/><rect x="765" y="620" width="30" height="30" fill="#141414"/><rect x="795" y="620" width="30" height="30" fill="#141414"/><rect x="705" y="650" width="30" height="30" fill="#141414"/><rect x="825" y="650" width="30" height="30" fill="#141414"/><rect x="705" y="680" width="30" height="30" fill="#141414"/><rect x="825" y="680" width="30" height="30" fill="#141414"/><rect x="705" y="710" width="30" height="30" fill="#141414"/><rect x="735" y="710" width="30" height="30" fill="#141414"/><rect x="765" y="710" width="30" height="30" fill="#141414"/><rect x="795" y="710" width="30" height="30" fill="#141414"/><rect x="825" y="710" width="30" height="30" fill="#141414"/><rect x="705" y="740" width="30" height="30" fill="#141414"/><rect x="825" y="740" width="30" height="30" fill="#141414"/><rect x="705" y="770" width="30" height="30" fill="#141414"/><rect x="825" y="770" width="30" height="30" fill="#141414"/><rect x="705" y="800" width="30" height="30" fill="#141414"/><rect x="825" y="800" width="30" height="30" fill="#141414"/><rect x="885" y="620" width="30" height="30" fill="#141414"/><rect x="915" y="620" width="30" height="30" fill="#141414"/><rect x="945" y="620" width="30" height="30" fill="#141414"/><rect x="975" y="620" width="30" height="30" fill="#141414"/><rect x="885" y="650" width="30" height="30" fill="#141414"/><rect x="1005" y="650" width="30" height="30" fill="#141414"/><rect x="885" y="680" width="30" height="30" fill="#141414"/><rect x="1005" y="680" width="30" height="30" fill="#141414"/><rect x="885" y="710" width="30" height="30" fill="#141414"/><rect x="1005" y="710" width="30" height="30" fill="#141414"/><rect x="885" y="740" width="30" height="30" fill="#141414"/><rect x="1005" y="740" width="30" height="30" fill="#141414"/><rect x="885" y="770" width="30" height="30" fill="#141414"/><rect x="1005" y="770" width="30" height="30" fill="#141414"/><rect x="885" y="800" width="30" height="30" fill="#141414"/><rect x="915" y="800" width="30" height="30" fill="#141414"/><rect x="945" y="800" width="30" height="30" fill="#141414"/><rect x="975" y="800" width="30" height="30" fill="#141414"/><rect x="1065" y="620" width="30" height="30" fill="#141414"/><rect x="1095" y="620" width="30" height="30" fill="#141414"/><rect x="1125" y="620" width="30" height="30" fill="#141414"/><rect x="1155" y="620" width="30" height="30" fill="#141414"/><rect x="1185" y="620" width="30" height="30" fill="#141414"/><rect x="1125" y="650" width="30" height="30" fill="#141414"/><rect x="1125" y="680" width="30" height="30" fill="#141414"/><rect x="1125" y="710" width="30" height="30" fill="#141414"/><rect x="1125" y="740" width="30" height="30" fill="#141414"/><rect x="1125" y="770" width="30" height="30" fill="#141414"/><rect x="1065" y="800" width="30" height="30" fill="#141414"/><rect x="1095" y="800" width="30" height="30" fill="#141414"/><rect x="1125" y="800" width="30" height="30" fill="#141414"/><rect x="1155" y="800" width="30" height="30" fill="#141414"/><rect x="1185" y="800" width="30" height="30" fill="#141414"/><rect x="1245" y="620" width="30" height="30" fill="#141414"/><rect x="1365" y="620" width="30" height="30" fill="#141414"/><rect x="1245" y="650" width="30" height="30" fill="#141414"/><rect x="1275" y="650" width="30" height="30" fill="#141414"/><rect x="1365" y="650" width="30" height="30" fill="#141414"/><rect x="1245" y="680" width="30" height="30" fill="#141414"/><rect x="1275" y="680" width="30" height="30" fill="#141414"/><rect x="1365" y="680" width="30" height="30" fill="#141414"/><rect x="1245" y="710" width="30" height="30" fill="#141414"/><rect x="1305" y="710" width="30" height="30" fill="#141414"/><rect x="1365" y="710" width="30" height="30" fill="#141414"/><rect x="1245" y="740" width="30" height="30" fill="#141414"/><rect x="1335" y="740" width="30" height="30" fill="#141414"/><rect x="1365" y="740" width="30" height="30" fill="#141414"/><rect x="1245" y="770" width="30" height="30" fill="#141414"/><rect x="1335" y="770" width="30" height="30" fill="#141414"/><rect x="1365" y="770" width="30" height="30" fill="#141414"/><rect x="1245" y="800" width="30" height="30" fill="#141414"/><rect x="1365" y="800" width="30" height="30" fill="#141414"/><rect x="1455" y="620" width="30" height="30" fill="#141414"/><rect x="1485" y="620" width="30" height="30" fill="#141414"/><rect x="1515" y="620" width="30" height="30" fill="#141414"/><rect x="1425" y="650" width="30" height="30" fill="#141414"/><rect x="1545" y="650" width="30" height="30" fill="#141414"/><rect x="1425" y="680" width="30" height="30" fill="#141414"/><rect x="1425" y="710" width="30" height="30" fill="#141414"/><rect x="1485" y="710" width="30" height="30" fill="#141414"/><rect x="1515" y="710" width="30" height="30" fill="#141414"/><rect x="1545" y="710" width="30" height="30" fill="#141414"/><rect x="1425" y="740" width="30" height="30" fill="#141414"/><rect x="1545" y="740" width="30" height="30" fill="#141414"/><rect x="1425" y="770" width="30" height="30" fill="#141414"/><rect x="1545" y="770" width="30" height="30" fill="#141414"/><rect x="1455" y="800" width="30" height="30" fill="#141414"/><rect x="1485" y="800" width="30" height="30" fill="#141414"/><rect x="1515" y="800" width="30" height="30" fill="#141414"/><rect x="1545" y="800" width="30" height="30" fill="#141414"/></svg>\`
      },
      {
        name: 'Glow Progress Bar',
        code: \`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#000000"/><defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="340" y="500" font-family="Arial, Helvetica, sans-serif" font-size="56" letter-spacing="4" fill="#FFFFFF">Loading...</text><text id="progress-text" x="1580" y="500" font-family="Arial, Helvetica, sans-serif" font-size="56" letter-spacing="4" fill="#FFFFFF" text-anchor="end">0%</text><g filter="url(#glow)"><rect x="340" y="540" width="1240" height="96" fill="#FFFFFF"/><rect x="346" y="546" width="1228" height="84" fill="#000000"/><rect id="progress-fill" x="346" y="546" width="1228" height="84" fill="#FFFFFF"/></g></svg>\`
      }
    ];

    let currentSampleIdx = 0;
    let renderedVideoBlob = null;
    let renderedVideoUrl = null;
    let isPlayingPreview = false;
    let previewAbort = false;
    let cachedPreviewFrames = [];
    let cachedPreviewKey = '';
    let renderCancelled = false;

    // Elements
    const editor = document.getElementById('svgEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    const lineCountBadge = document.getElementById('lineCountBadge');
    const validationBanner = document.getElementById('validationBanner');
    const validationErrorText = document.getElementById('validationErrorText');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewContainer = document.getElementById('previewContainer');
    const togglePlayBtn = document.getElementById('togglePlayBtn');
    const playBtnText = document.getElementById('playBtnText');
    const timelineScrubber = document.getElementById('timelineScrubber');
    const timeDisplay = document.getElementById('timeDisplay');
    const animStyleSelect = document.getElementById('animStyleSelect');
    const durationRange = document.getElementById('durationRange');
    const durationNumber = document.getElementById('durationNumber');
    const durationLabel = document.getElementById('durationLabel');
    const resSelect = document.getElementById('resSelect');
    const fpsSelect = document.getElementById('fpsSelect');
    const bgSourceSelect = document.getElementById('bgSourceSelect');
    const customBgControls = document.getElementById('customBgControls');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const bgColorHex = document.getElementById('bgColorHex');
    const bgTransparentCheck = document.getElementById('bgTransparentCheck');
    const renderBtn = document.getElementById('renderBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressSection = document.getElementById('progressSection');
    const phaseBadge = document.getElementById('phaseBadge');
    const statusText = document.getElementById('statusText');
    const percentText = document.getElementById('percentText');
    const progressBar = document.getElementById('progressBar');
    const substatusText = document.getElementById('substatusText');
    const cancelRenderBtn = document.getElementById('cancelRenderBtn');
    const videoOutputSection = document.getElementById('videoOutputSection');
    const renderedPlayer = document.getElementById('renderedPlayer');
    const videoMetaBadge = document.getElementById('videoMetaBadge');
    const rotationsWrapper = document.getElementById('rotationsWrapper');
    const rotationsInput = document.getElementById('rotationsInput');
    const pulsesWrapper = document.getElementById('pulsesWrapper');
    const pulsesInput = document.getElementById('pulsesInput');
    let isCustomRotations = false;

    function updateLineNumbers() {
      const lines = editor.value.split('\\n').length;
      lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
      lineCountBadge.textContent = lines + ' lines';
    }
    editor.addEventListener('scroll', () => { lineNumbers.scrollTop = editor.scrollTop; });
    editor.addEventListener('input', () => {
      invalidatePreviewCache();
      updateLineNumbers();
      drawCurrentPreview();
    });

    function checkSvg(code) {
      const p = new DOMParser();
      const doc = p.parseFromString(code, 'image/svg+xml');
      const err = doc.querySelector('parsererror');
      if (err) return { valid: false, error: err.textContent.split('\\n')[0] };
      if (!doc.documentElement || doc.documentElement.nodeName.toLowerCase() !== 'svg') {
        return { valid: false, error: 'Root tag must be <svg>' };
      }
      return { valid: true };
    }

    function applyAnimation(svgStr, t, style, dur, spinCount, pulseCount) {
      const p = new DOMParser();
      const doc = p.parseFromString(svgStr, 'image/svg+xml');
      const root = doc.documentElement;
      let vb = root.getAttribute('viewBox');
      let vbX = 0, vbY = 0, w = 500, h = 500;
      if (vb) {
        const parts = vb.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every(n => !isNaN(n))) {
          vbX = parts[0]; vbY = parts[1]; w = parts[2]; h = parts[3];
        }
      }
      const wAttr = root.getAttribute('width');
      const hAttr = root.getAttribute('height');
      if (!wAttr || wAttr.includes('%')) root.setAttribute('width', String(w));
      if (!hAttr || hAttr.includes('%')) root.setAttribute('height', String(h));
      if (root.hasAttribute('style')) {
        root.style.removeProperty('width');
        root.style.removeProperty('height');
        root.style.removeProperty('max-width');
        root.style.removeProperty('max-height');
      }
      const cx = vbX + w / 2, cy = vbY + h / 2;
      const ease = 1 - Math.pow(1 - t, 3);

      function isBgRect(el, vbW, vbH) {
        if (!el || el.nodeName.toLowerCase() !== 'rect') return false;
        const stroke = el.getAttribute('stroke') || el.style.stroke;
        if (stroke && stroke !== 'none') return false;
        const wAttr = el.getAttribute('width') || '';
        const hAttr = el.getAttribute('height') || '';
        const x = parseFloat(el.getAttribute('x') || '0') || 0;
        const y = parseFloat(el.getAttribute('y') || '0') || 0;
        const isFullW = wAttr.includes('%') || parseFloat(wAttr) >= vbW * 0.95;
        const isFullH = hAttr.includes('%') || parseFloat(hAttr) >= vbH * 0.95;
        return isFullW && isFullH && Math.abs(x) <= vbW * 0.05 && Math.abs(y) <= vbH * 0.05;
      }

      if (style === 'progress') {
        const fillEl = doc.getElementById('progress-fill') || root.querySelector('#progress-fill');
        if (fillEl && !isBgRect(fillEl, w, h)) {
          let originalWidth = 0;
          const wAttr = fillEl.getAttribute('data-original-width') || fillEl.getAttribute('width');
          if (wAttr) {
            originalWidth = parseFloat(wAttr) || 0;
          } else if (fillEl.style && fillEl.style.width) {
            originalWidth = parseFloat(fillEl.style.width) || 0;
          }
          if (!fillEl.hasAttribute('data-original-width') && originalWidth > 0) {
            fillEl.setAttribute('data-original-width', String(originalWidth));
          }
          const currentW = Math.max(0, originalWidth * t);
          fillEl.setAttribute('width', String(currentW));
          if (fillEl.style && fillEl.style.width) {
            fillEl.style.width = currentW + 'px';
          }
        }
        const textEl = doc.getElementById('progress-text') || root.querySelector('#progress-text');
        if (textEl) {
          textEl.textContent = Math.round(t * 100) + '%';
        }
      } else if (style === 'draw-on') {
        const geoms = root.querySelectorAll('path, line, polyline, polygon, circle, rect, ellipse');
        geoms.forEach(el => {
          if (isBgRect(el, w, h)) {
            el.style.fillOpacity = '1';
            el.style.opacity = '1';
            return;
          }
          const len = 350;
          el.style.strokeDasharray = len + ' ' + len;
          el.style.strokeDashoffset = ((1 - t) * len);
          if (t < 0.4) el.style.fillOpacity = '0';
          else el.style.fillOpacity = String((t - 0.4) / 0.6);
        });
      } else {
        const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (style === 'pulse') {
          const count = pulseCount || 4;
          const opacity = 0.55 + 0.45 * Math.cos(2 * Math.PI * count * t);
          g.setAttribute('style', 'opacity:' + opacity);
          g.setAttribute('opacity', String(opacity));
        }
        if (style === 'fade-in') g.setAttribute('style', 'opacity:' + ease);
        if (style === 'zoom-in') {
          const sc = 0.2 + 0.8 * ease;
          g.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + sc + ') translate(' + -cx + ' ' + -cy + ')');
          g.setAttribute('style', 'opacity:' + Math.min(1, t * 2));
        }
        if (style === 'rotate-in') {
          const rot = (1 - ease) * -180;
          const sc = 0.3 + 0.7 * ease;
          g.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + rot + ') scale(' + sc + ') translate(' + -cx + ' ' + -cy + ')');
        }
        if (style === 'slide-up') {
          const dy = (1 - ease) * 100;
          g.setAttribute('transform', 'translate(0 ' + dy + ')');
          g.setAttribute('style', 'opacity:' + Math.min(1, t * 2));
        }
        if (style === 'pulse-loop') {
          const sc = 1 + 0.12 * Math.sin(t * Math.PI * 2 * Math.max(1, Math.round(dur * 0.8)));
          g.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + sc + ') translate(' + -cx + ' ' + -cy + ')');
        }
        if (style === 'spin-continuous') {
          const count = spinCount || Math.max(1, Math.round(dur / 2));
          const angle = t * 360 * count;
          g.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + angle + ') translate(' + -cx + ' ' + -cy + ')');
        }
        const nodesToMove = [];
        Array.from(root.childNodes).forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const tag = child.nodeName.toLowerCase();
            if (tag === 'defs' || isBgRect(child, w, h)) return;
          }
          nodesToMove.push(child);
        });
        nodesToMove.forEach(c => g.appendChild(c));
        root.appendChild(g);
      }
      return new XMLSerializer().serializeToString(doc);
    }

    async function rasterizeFrameToBitmap(frameSvg, width, height, bg, isTrans, bgSource = 'svg') {
      const blob = new Blob([frameSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      try {
        if ('decode' in img) await img.decode();
        else await new Promise((r, rej) => { img.onload = r; img.onerror = rej; });
      } finally {
        URL.revokeObjectURL(url);
      }

      let c;
      if (typeof OffscreenCanvas !== 'undefined') c = new OffscreenCanvas(width, height);
      else { c = document.createElement('canvas'); c.width = width; c.height = height; }
      const isAlpha = bgSource === 'svg' || isTrans;
      const ctx = c.getContext('2d', { alpha: isAlpha });

      if (isAlpha) ctx.clearRect(0, 0, width, height);
      else { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }

      const naturalWidth = img.naturalWidth || width;
      const naturalHeight = img.naturalHeight || height;
      const scale = Math.max(width / naturalWidth, height / naturalHeight);
      const drawW = naturalWidth * scale;
      const drawH = naturalHeight * scale;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      return await createImageBitmap(c);
    }

    function invalidatePreviewCache() {
      cachedPreviewFrames.forEach(f => { try { f.close(); } catch(e){} });
      cachedPreviewFrames = [];
      cachedPreviewKey = '';
    }

    function getPreviewKey() {
      return [editor.value, animStyleSelect.value, durationRange.value, fpsSelect.value, bgSourceSelect.value, bgColorPicker.value, bgTransparentCheck.checked, rotationsInput.value, pulsesInput.value].join('|');
    }

    async function ensurePreviewFrames() {
      const key = getPreviewKey();
      if (cachedPreviewFrames.length > 0 && cachedPreviewKey === key) {
        return cachedPreviewFrames;
      }
      invalidatePreviewCache();
      const code = editor.value.trim();
      const dur = parseFloat(durationRange.value);
      const fps = parseInt(fpsSelect.value);
      const style = animStyleSelect.value;
      const bgSource = bgSourceSelect.value;
      const isTrans = bgTransparentCheck.checked;
      const bg = bgColorPicker.value;
      const spinCount = parseInt(rotationsInput.value) || Math.max(1, Math.round(dur / 2));
      const pulseCount = parseInt(pulsesInput.value) || 4;
      const totalFrames = Math.max(2, Math.round(dur * fps));

      const w = 640, h = 360;
      const frames = [];
      for (let i = 0; i < totalFrames; i++) {
        const t = totalFrames <= 1 ? 1 : i / (totalFrames - 1);
        const svg = applyAnimation(code, t, style, dur, spinCount, pulseCount);
        const bm = await rasterizeFrameToBitmap(svg, w, h, bg, isTrans, bgSource);
        frames.push(bm);
      }
      cachedPreviewFrames = frames;
      cachedPreviewKey = key;
      return cachedPreviewFrames;
    }

    function updateStageBg() {
      const bgSource = bgSourceSelect.value;
      if (bgSource === 'svg' || bgTransparentCheck.checked) {
        previewContainer.className = 'w-full max-w-md h-72 rounded-xl border border-neutral-800 flex items-center justify-center p-4 relative overflow-hidden transition-all shadow-inner checkerboard';
        previewContainer.style.backgroundColor = 'transparent';
      } else {
        previewContainer.className = 'w-full max-w-md h-72 rounded-xl border border-neutral-800 flex items-center justify-center p-4 relative overflow-hidden transition-all shadow-inner';
        previewContainer.style.backgroundColor = bgColorPicker.value;
      }
    }

    async function drawCurrentPreview() {
      updateStageBg();
      const code = editor.value.trim();
      const val = checkSvg(code);
      if (!val.valid) {
        validationBanner.classList.remove('hidden');
        validationErrorText.textContent = val.error;
        return;
      }
      validationBanner.classList.add('hidden');
      const dur = parseFloat(durationRange.value);
      const t = parseFloat(timelineScrubber.value) / 100;
      timeDisplay.textContent = (t * dur).toFixed(1) + 's / ' + dur + 's';

      const w = 640, h = 360;
      previewCanvas.width = w;
      previewCanvas.height = h;
      const ctx = previewCanvas.getContext('2d');

      const key = getPreviewKey();
      const totalFrames = Math.max(2, Math.round(dur * parseInt(fpsSelect.value)));
      const frameIdx = Math.min(totalFrames - 1, Math.round(t * (totalFrames - 1)));

      if (cachedPreviewFrames.length === totalFrames && cachedPreviewKey === key) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(cachedPreviewFrames[frameIdx], 0, 0);
      } else {
        const style = animStyleSelect.value;
        const bgSource = bgSourceSelect.value;
        const spinCount = parseInt(rotationsInput.value) || Math.max(1, Math.round(dur / 2));
        const pulseCount = parseInt(pulsesInput.value) || 4;
        const svg = applyAnimation(code, t, style, dur, spinCount, pulseCount);
        const bm = await rasterizeFrameToBitmap(svg, w, h, bgColorPicker.value, bgTransparentCheck.checked, bgSource);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(bm, 0, 0);
        bm.close();
      }
    }

    async function playPreviewLoop() {
      previewAbort = false;
      playBtnText.textContent = 'Buffering...';
      togglePlayBtn.disabled = true;

      const frames = await ensurePreviewFrames();
      togglePlayBtn.disabled = false;
      playBtnText.textContent = 'Pause';
      isPlayingPreview = true;

      const dur = parseFloat(durationRange.value);
      const fps = parseInt(fpsSelect.value);
      const totalFrames = frames.length;
      const frameInterval = 1000 / fps;

      const ctx = previewCanvas.getContext('2d');
      let startIdx = Math.round((parseFloat(timelineScrubber.value) / 100) * (totalFrames - 1));
      if (startIdx >= totalFrames - 1) startIdx = 0;

      while (isPlayingPreview && !previewAbort) {
        let next = performance.now();
        for (let i = startIdx; i < totalFrames; i++) {
          if (!isPlayingPreview || previewAbort) break;

          ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
          ctx.drawImage(frames[i], 0, 0);

          const t = i / (totalFrames - 1);
          timelineScrubber.value = t * 100;
          timeDisplay.textContent = (t * dur).toFixed(1) + 's / ' + dur + 's';

          next += frameInterval;
          const delay = Math.max(0, next - performance.now());
          await new Promise(r => setTimeout(r, delay));
        }
        startIdx = 0;
      }

      isPlayingPreview = false;
      playBtnText.textContent = 'Play Preview';
    }

    togglePlayBtn.addEventListener('click', () => {
      if (isPlayingPreview) {
        isPlayingPreview = false;
        previewAbort = true;
        playBtnText.textContent = 'Play Preview';
      } else {
        playPreviewLoop();
      }
    });

    timelineScrubber.addEventListener('input', () => {
      if (isPlayingPreview) {
        isPlayingPreview = false;
        previewAbort = true;
        playBtnText.textContent = 'Play Preview';
      }
      drawCurrentPreview();
    });

    durationRange.addEventListener('input', (e) => {
      durationNumber.value = e.target.value;
      durationLabel.textContent = e.target.value + 's';
      if (!isCustomRotations) {
        rotationsInput.value = Math.max(1, Math.round(parseFloat(e.target.value) / 2));
      }
      invalidatePreviewCache();
      drawCurrentPreview();
    });
    durationNumber.addEventListener('input', (e) => {
      let val = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
      durationRange.value = val;
      durationLabel.textContent = val + 's';
      if (!isCustomRotations) {
        rotationsInput.value = Math.max(1, Math.round(val / 2));
      }
      invalidatePreviewCache();
      drawCurrentPreview();
    });

    rotationsInput.addEventListener('input', () => {
      isCustomRotations = true;
      invalidatePreviewCache();
      drawCurrentPreview();
    });

    pulsesInput.addEventListener('input', () => {
      invalidatePreviewCache();
      drawCurrentPreview();
    });

    bgSourceSelect.addEventListener('change', () => {
      const isSvg = bgSourceSelect.value === 'svg';
      if (isSvg) {
        customBgControls.classList.add('opacity-35', 'pointer-events-none');
        bgColorPicker.disabled = true;
        bgTransparentCheck.disabled = true;
      } else {
        customBgControls.classList.remove('opacity-35', 'pointer-events-none');
        bgColorPicker.disabled = false;
        bgTransparentCheck.disabled = false;
      }
      invalidatePreviewCache();
      drawCurrentPreview();
    });

    bgColorPicker.addEventListener('input', (e) => {
      bgColorHex.textContent = e.target.value;
      invalidatePreviewCache();
      drawCurrentPreview();
    });
    bgTransparentCheck.addEventListener('change', () => {
      invalidatePreviewCache();
      drawCurrentPreview();
    });
    animStyleSelect.addEventListener('change', () => {
      if (animStyleSelect.value === 'spin-continuous') {
        rotationsWrapper.classList.remove('hidden');
      } else {
        rotationsWrapper.classList.add('hidden');
      }
      if (animStyleSelect.value === 'pulse') {
        pulsesWrapper.classList.remove('hidden');
      } else {
        pulsesWrapper.classList.add('hidden');
      }
      invalidatePreviewCache();
      drawCurrentPreview();
    });
    fpsSelect.addEventListener('change', () => {
      invalidatePreviewCache();
      drawCurrentPreview();
    });

    document.getElementById('sampleBtn').addEventListener('click', () => {
      editor.value = SAMPLES[currentSampleIdx].code;
      currentSampleIdx = (currentSampleIdx + 1) % SAMPLES.length;
      isCustomRotations = false;
      rotationsInput.value = Math.max(1, Math.round(parseFloat(durationRange.value) / 2));
      invalidatePreviewCache();
      updateLineNumbers();
      drawCurrentPreview();
    });
    document.getElementById('clearBtn').addEventListener('click', () => {
      editor.value = '';
      invalidatePreviewCache();
      updateLineNumbers();
      drawCurrentPreview();
    });

    editor.value = SAMPLES[0].code;
    updateLineNumbers();
    drawCurrentPreview();

    cancelRenderBtn.addEventListener('click', () => {
      renderCancelled = true;
    });

    // TWO-PHASE RENDER ENGINE: WebCodecs + Muxer (or MediaRecorder fallback)
    renderBtn.addEventListener('click', async () => {
      if (isPlayingPreview) {
        isPlayingPreview = false;
        previewAbort = true;
        playBtnText.textContent = 'Play Preview';
      }

      const code = editor.value.trim();
      const val = checkSvg(code);
      if (!val.valid) {
        alert('Please fix SVG syntax errors before rendering.');
        return;
      }

      renderCancelled = false;
      renderBtn.disabled = true;
      renderBtn.classList.add('opacity-50');
      progressSection.classList.remove('hidden');

      const dur = parseFloat(durationRange.value);
      const fps = parseInt(fpsSelect.value);
      let [resW, resH] = resSelect.value.split('x').map(Number);
      resW = resW % 2 === 0 ? resW : resW - 1;
      resH = resH % 2 === 0 ? resH : resH - 1;

      const style = animStyleSelect.value;
      const bgSource = bgSourceSelect.value;
      const spinCount = parseInt(rotationsInput.value) || Math.max(1, Math.round(dur / 2));
      const pulseCount = parseInt(pulsesInput.value) || 4;
      const totalFrames = Math.max(2, Math.round(dur * fps));
      const frameInterval = 1000 / fps;
      const isTransparent = bgTransparentCheck.checked;
      const bg = bgColorPicker.value;

      // PHASE 1: Pre-render all frames
      phaseBadge.textContent = 'Phase 1 of 2: Preparing frames';
      substatusText.textContent = 'Pre-rasterizing all SVG frames into memory ImageBitmaps';
      progressBar.className = 'h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-75 w-0';

      const frames = [];
      try {
        for (let i = 0; i < totalFrames; i++) {
          if (renderCancelled) throw new Error('Cancelled by user');
          const t = totalFrames <= 1 ? 1 : i / (totalFrames - 1);
          const frameSvg = applyAnimation(code, t, style, dur, spinCount, pulseCount);
          const bm = await rasterizeFrameToBitmap(frameSvg, resW, resH, bg, isTransparent, bgSource);
          frames.push(bm);

          const pct = Math.round(((i + 1) / totalFrames) * 100);
          progressBar.style.width = pct + '%';
          percentText.textContent = pct + '%';
          statusText.textContent = 'Preparing frame ' + (i + 1) + ' of ' + totalFrames + '...';
          await new Promise(r => setTimeout(r, 0));
        }

        // PHASE 2: Check if WebCodecs is available
        phaseBadge.textContent = 'Phase 2 of 2: Recording video';
        progressBar.className = 'h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-75 w-0';

        if (hasWebCodecs) {
          substatusText.textContent = 'Frame-accurate encoding via WebCodecs (VideoEncoder + mp4-muxer)';
          const target = new ArrayBufferTarget();
          const muxer = new Muxer({
            target,
            video: { codec: 'avc', width: resW, height: resH },
            fastStart: 'in-memory',
            firstTimestampBehavior: 'offset'
          });

          let encError = null;
          const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => { encError = e; }
          });

          encoder.configure({
            codec: 'avc1.640028',
            width: resW,
            height: resH,
            bitrate: 8_000_000,
            framerate: fps
          });

          for (let i = 0; i < totalFrames; i++) {
            if (renderCancelled) {
              encoder.close();
              throw new Error('Cancelled by user');
            }
            if (encError) throw encError;

            const vf = new VideoFrame(frames[i], {
              timestamp: Math.round((i * 1_000_000) / fps),
              duration: Math.round(1_000_000 / fps)
            });
            encoder.encode(vf, { keyFrame: i % (fps * 2) === 0 });
            vf.close();

            const pct = Math.round(((i + 1) / totalFrames) * 100);
            progressBar.style.width = pct + '%';
            percentText.textContent = pct + '%';
            statusText.textContent = 'Encoding frame ' + (i + 1) + ' of ' + totalFrames + ' (WebCodecs)...';

            if (encoder.encodeQueueSize > 5) {
              await new Promise(res => {
                const check = () => {
                  if (encoder.encodeQueueSize <= 2) res();
                  else setTimeout(check, 4);
                };
                check();
              });
            }
          }

          await encoder.flush();
          encoder.close();
          muxer.finalize();

          const blob = new Blob([target.buffer], { type: 'video/mp4' });
          renderedVideoBlob = blob;
          renderedVideoUrl = URL.createObjectURL(blob);

          renderedPlayer.src = renderedVideoUrl;
          videoOutputSection.classList.remove('hidden');
          videoMetaBadge.textContent = resW + 'x' + resH + ' • ' + dur + 's • ' + (blob.size / 1024).toFixed(1) + ' KB (WebCodecs MP4)';
        } else {
          // Fallback MediaRecorder with warm-up fix
          substatusText.textContent = 'Drift-compensated stream capture via MediaRecorder (warmed up)';
          const canvas = document.createElement('canvas');
          canvas.width = resW; canvas.height = resH;
          const isAlpha = bgSource === 'svg' || isTransparent;
          const ctx = canvas.getContext('2d', { alpha: isAlpha });
          if (isAlpha) ctx.clearRect(0, 0, resW, resH);
          ctx.drawImage(frames[0], 0, 0);

          const stream = canvas.captureStream(fps);
          const track = stream.getVideoTracks()[0];
          const recorder = new MediaRecorder(stream);
          const chunks = [];
          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

          const stopPromise = new Promise(resolve => {
            recorder.onstop = () => {
              stream.getTracks().forEach(t => t.stop());
              const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
              resolve(blob);
            };
          });

          recorder.start(100);

          // Wait for first dataavailable proof of warm-up
          await new Promise(res => {
            let done = false;
            const onData = (e) => {
              if (!done && e.data && e.data.size > 0) {
                done = true;
                recorder.removeEventListener('dataavailable', onData);
                res();
              }
            };
            recorder.addEventListener('dataavailable', onData);
            setTimeout(() => { if (!done) { done = true; res(); } }, 450);
          });

          let next = performance.now();
          for (let i = 0; i < totalFrames; i++) {
            if (renderCancelled) {
              recorder.stop();
              throw new Error('Cancelled by user');
            }
            if (isAlpha) ctx.clearRect(0, 0, resW, resH);
            ctx.drawImage(frames[i], 0, 0);
            if (track && track.requestFrame) track.requestFrame();

            const pct = Math.round(((i + 1) / totalFrames) * 100);
            progressBar.style.width = pct + '%';
            percentText.textContent = pct + '%';
            statusText.textContent = 'Recording frame ' + (i + 1) + ' of ' + totalFrames + '...';

            next += frameInterval;
            const delay = Math.max(0, next - performance.now());
            await new Promise(r => setTimeout(r, delay));
          }

          await new Promise(r => setTimeout(r, Math.max(80, frameInterval * 1.5)));
          if (recorder.state !== 'inactive') recorder.stop();

          const blob = await stopPromise;
          renderedVideoBlob = blob;
          renderedVideoUrl = URL.createObjectURL(blob);

          renderedPlayer.src = renderedVideoUrl;
          videoOutputSection.classList.remove('hidden');
          videoMetaBadge.textContent = resW + 'x' + resH + ' • ' + dur + 's • ' + (blob.size / 1024).toFixed(1) + ' KB';
        }

        downloadBtn.disabled = false;
        downloadBtn.className = 'py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20';
      } catch (err) {
        if (!renderCancelled) alert('Rendering error: ' + err.message);
      } finally {
        frames.forEach(f => { try { f.close(); } catch(e){} });
        renderBtn.disabled = false;
        renderBtn.classList.remove('opacity-50');
        progressSection.classList.add('hidden');
      }
    });

    downloadBtn.addEventListener('click', () => {
      if (!renderedVideoUrl) return;
      const dur = durationRange.value;
      const ext = hasWebCodecs ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = renderedVideoUrl;
      a.download = 'svg-video-' + dur + 's.' + ext;
      a.click();
    });
  </script>
</body>
</html>`;
}
