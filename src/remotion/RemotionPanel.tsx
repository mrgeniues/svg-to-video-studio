import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Download,
  Sliders,
  Maximize2,
  Film,
  Sparkles,
  Layers,
  Check,
  Palette,
  Type,
  LayoutTemplate,
  AlertCircle,
  XCircle,
  Code,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { REMOTION_TEMPLATES, RemotionTemplate } from './templates';
import { OVERLAYS, stringSeedRng, escapeXmlOverlay } from './overlays';
import { renderSvgFramesToVideo } from './videoRenderer';
import {
  RESOLUTIONS,
  RenderResolution,
  RenderProgress,
  RenderResult,
  checkBrowserCapabilities
} from '../utils/renderer';

export const DEFAULT_CUSTOM_CODE = `// Compose background + overlays into a complete SVG frame
const bg = \`<rect width="\${W}" height="\${H}" fill="#0b0f19" />\`;
const grid = ctx.O.gridOverlay(frame, totalFrames, W, H, { accent: ctx.accent });
const title = ctx.O.kineticTitle(frame, totalFrames, W, H, { title: ctx.title, accent: ctx.accent });
const chart = ctx.O.barChart(frame, totalFrames, W, H, { accent: ctx.accent });

return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${W} \${H}" width="\${W}" height="\${H}">
  \${bg}
  \${grid}
  \${title}
  \${chart}
</svg>\`;`;

export function makeCustomCodeCtx(title: string, accent: string) {
  return {
    title: title || 'CUSTOM MOTION GRAPHIC',
    accent: accent || '#6366f1',
    ease: (t: number) => {
      const c = Math.max(0, Math.min(1, t));
      return c * c * (3 - 2 * c);
    },
    easeOut: (t: number) => {
      const c = Math.max(0, Math.min(1, t));
      return 1 - (1 - c) * (1 - c);
    },
    easeInOut: (t: number) => {
      const c = Math.max(0, Math.min(1, t));
      return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
    },
    clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    TAU: Math.PI * 2,
    rand: (seedStr: string = 'rnd') => stringSeedRng(String(seedStr))(),
    O: OVERLAYS
  };
}

const CUSTOM_CODE_TEMPLATE_META: RemotionTemplate = {
  id: 'custom-code',
  name: 'Custom Code',
  tagline: 'Programmatic SVG frame generator with full JS control',
  defaultTitle: 'CUSTOM MOTION GRAPHIC',
  defaultAccent: '#6366f1',
  presetAccents: ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ffffff'],
  scenes: [
    'Custom JS code returning complete <svg> per frame',
    'Access frame, totalFrames, W, H, & ctx runtime',
    'Built-in 14-component HUD & motion overlay library'
  ],
  renderFrame: () => ''
};

interface RemotionPanelProps {
  duration: number;
  setDuration: (val: number) => void;
  resolutionId: string;
  setResolutionId: (val: string) => void;
  fps: number;
  setFps: (val: number) => void;
  selectedResolution: RenderResolution;
  totalFrames: number;
}

export const RemotionPanel: React.FC<RemotionPanelProps> = ({
  duration,
  setDuration,
  resolutionId,
  setResolutionId,
  fps,
  setFps,
  selectedResolution,
  totalFrames
}) => {
  // Selected Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(REMOTION_TEMPLATES[0].id);
  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId === 'custom-code') {
      return CUSTOM_CODE_TEMPLATE_META;
    }
    return REMOTION_TEMPLATES.find((t) => t.id === selectedTemplateId) || REMOTION_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Custom Controls State
  const [title, setTitle] = useState<string>(selectedTemplate.defaultTitle);
  const [accent, setAccent] = useState<string>(selectedTemplate.defaultAccent);

  // Custom Code State
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [codeDraft, setCodeDraft] = useState<string>(DEFAULT_CUSTOM_CODE);
  const [customCodeFn, setCustomCodeFn] = useState<Function>(() => {
    return new Function('frame', 'totalFrames', 'W', 'H', 'ctx', DEFAULT_CUSTOM_CODE);
  });
  const [validationStatus, setValidationStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isApiRefOpen, setIsApiRefOpen] = useState<boolean>(false);
  const [customCodeError, setCustomCodeError] = useState<string | null>(null);

  // When template changes, update default title & accent
  const handleSelectTemplate = (tpl: RemotionTemplate) => {
    setSelectedTemplateId(tpl.id);
    setTitle(tpl.defaultTitle);
    setAccent(tpl.defaultAccent);
    setPreviewTime(0);
    setIsPlaying(false);
    setCustomCodeError(null);
  };

  const handleSelectCustomCode = () => {
    setSelectedTemplateId('custom-code');
    setIsCodeModalOpen(true);
  };

  // Live Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [previewTime, setPreviewTime] = useState<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastPlayTimeRef = useRef<number>(0);

  // Render Video State
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Active Tab for Preview: 'live' or 'rendered'
  const [activePreviewTab, setActivePreviewTab] = useState<'live' | 'rendered'>('live');
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  const browserCheck = useMemo(() => checkBrowserCapabilities(), []);

  // Compute current frame index
  const currentFrameIndex = useMemo(() => {
    if (totalFrames <= 1) return 0;
    return Math.min(totalFrames - 1, Math.max(0, Math.floor((previewTime / duration) * totalFrames)));
  }, [previewTime, duration, totalFrames]);

  // Compute current frame SVG with try/catch isolation
  const currentFrameSvg = useMemo(() => {
    if (selectedTemplateId === 'custom-code') {
      try {
        const ctx = makeCustomCodeCtx(title, accent);
        return customCodeFn(
          currentFrameIndex,
          totalFrames,
          selectedResolution.width,
          selectedResolution.height,
          ctx
        );
      } catch (err: any) {
        const errMsg = `Custom code error at frame ${currentFrameIndex}: ${err.message || String(err)}`;
        setTimeout(() => {
          setIsPlaying(false);
          setCustomCodeError(errMsg);
        }, 0);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${selectedResolution.width} ${selectedResolution.height}" width="${selectedResolution.width}" height="${selectedResolution.height}">
          <rect width="${selectedResolution.width}" height="${selectedResolution.height}" fill="#180a0a" />
          <text x="${selectedResolution.width / 2}" y="${selectedResolution.height / 2 - 20}" fill="#ef4444" font-size="22" font-family="monospace" text-anchor="middle" font-weight="bold">Custom Code Execution Error</text>
          <text x="${selectedResolution.width / 2}" y="${selectedResolution.height / 2 + 16}" fill="#fca5a5" font-size="14" font-family="monospace" text-anchor="middle">${escapeXmlOverlay(err.message || String(err))}</text>
          <text x="${selectedResolution.width / 2}" y="${selectedResolution.height / 2 + 54}" fill="#94a3b8" font-size="13" font-family="monospace" text-anchor="middle">Frame ${currentFrameIndex} of ${totalFrames}</text>
        </svg>`;
      }
    }

    return selectedTemplate.renderFrame(
      previewTime,
      duration,
      selectedResolution.width,
      selectedResolution.height,
      { title, accent }
    );
  }, [
    selectedTemplateId,
    selectedTemplate,
    customCodeFn,
    currentFrameIndex,
    totalFrames,
    previewTime,
    duration,
    selectedResolution,
    title,
    accent
  ]);

  // RequestAnimationFrame playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    lastPlayTimeRef.current = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastPlayTimeRef.current) / 1000;
      lastPlayTimeRef.current = now;

      setPreviewTime((prev) => {
        const next = prev + deltaSec;
        if (next >= duration) {
          // Loop seamlessly
          return 0;
        }
        return next;
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, duration]);

  // Handle Play / Pause Toggle
  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleResetPreview = () => {
    setIsPlaying(false);
    setPreviewTime(0);
  };

  // Custom Code Validation & Compile Helpers
  const validateCustomCode = (code: string) => {
    try {
      const fn = new Function('frame', 'totalFrames', 'W', 'H', 'ctx', code);
      const testCtx = makeCustomCodeCtx(title || 'TEST', accent || '#6366f1');
      const testSvg = fn(0, totalFrames, selectedResolution.width, selectedResolution.height, testCtx);
      if (typeof testSvg !== 'string' || !testSvg.trim().startsWith('<svg')) {
        return {
          valid: false,
          error: 'Code must return a valid SVG string starting with <svg>...</svg>'
        };
      }
      return { valid: true, fn };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || String(err)
      };
    }
  };

  const handleValidateCode = () => {
    const res = validateCustomCode(codeDraft);
    if (res.valid) {
      setValidationStatus({ type: 'success', message: 'Code valid' });
    } else {
      setValidationStatus({ type: 'error', message: res.error || 'Code invalid' });
    }
  };

  const handleApplyAndPreview = () => {
    const res = validateCustomCode(codeDraft);
    if (res.valid && res.fn) {
      setValidationStatus({ type: 'success', message: 'Code valid' });
      setCustomCodeFn(() => res.fn!);
      setSelectedTemplateId('custom-code');
      setCustomCodeError(null);
      setPreviewTime(0);
      setIsPlaying(false);
      setIsCodeModalOpen(false);
    } else {
      setValidationStatus({ type: 'error', message: res.error || 'Cannot apply invalid code' });
    }
  };

  const handleResetToStarter = () => {
    setCodeDraft(DEFAULT_CUSTOM_CODE);
    setValidationStatus(null);
  };

  // Render Remotion Video to MP4
  const handleStartRender = async () => {
    setIsPlaying(false);
    setIsRendering(true);
    setRenderError(null);
    setRenderResult(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const tpl = selectedTemplate;
    const currentTitle = title;
    const currentAccent = accent;
    const isCustom = selectedTemplateId === 'custom-code';
    const width = selectedResolution.width;
    const height = selectedResolution.height;

    try {
      const result = await renderSvgFramesToVideo({
        getFrameSvg: (frameIdx, totalF) => {
          if (isCustom) {
            try {
              const ctx = makeCustomCodeCtx(currentTitle, currentAccent);
              return customCodeFn(frameIdx, totalF, width, height, ctx);
            } catch (err: any) {
              throw new Error(`Custom code error at frame ${frameIdx}: ${err.message || String(err)}`);
            }
          } else {
            const t = totalF <= 1 ? 0 : (frameIdx / (totalF - 1)) * duration;
            return tpl.renderFrame(t, duration, width, height, {
              title: currentTitle,
              accent: currentAccent
            });
          }
        },
        duration,
        fps,
        width,
        height,
        onProgress: (p) => {
          setRenderProgress(p);
        },
        signal: abortController.signal
      });

      setRenderResult(result);
      setActivePreviewTab('rendered');
      setTimeout(() => {
        if (videoPlayerRef.current) {
          videoPlayerRef.current.currentTime = 0;
          videoPlayerRef.current.play().catch(() => {});
        }
      }, 150);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setRenderError('Remotion rendering was cancelled.');
      } else {
        setRenderError(err.message || 'An error occurred during Remotion video render.');
      }
    } finally {
      setIsRendering(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRender = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDownloadVideo = () => {
    if (!renderResult) return;
    const a = document.createElement('a');
    a.href = renderResult.url;
    a.download = renderResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Top Banner introducing Remotion Mode */}
      <div className="bg-indigo-950/40 border-b border-indigo-800/40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-neutral-200">
            Remotion Code-Driven Motion Video Templates
          </span>
          <span className="text-[11px] text-neutral-400 hidden md:inline">
            — 100% deterministic SVG frame generator rendered directly to MP4
          </span>
        </div>
        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-700/50">
          Pure Client-Side WebCodecs
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left Column: Template Selection & Controls (5 cols) */}
        <div className="lg:col-span-5 border-r border-neutral-800 flex flex-col bg-neutral-900/30 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Section 1: Template Picker Cards */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                SELECT REMOTION TEMPLATE (14 AVAILABLE)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {REMOTION_TEMPLATES.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`text-left p-4 rounded-xl border transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-neutral-800/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {tpl.name}
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          )}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{tpl.tagline}</p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border border-neutral-700 shrink-0 mt-0.5"
                        style={{ backgroundColor: tpl.defaultAccent }}
                        title="Template primary color"
                      />
                    </div>

                    {/* Animated scenes list */}
                    <div className="mt-3 pt-2.5 border-t border-neutral-800/80">
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Animated Scene Sections:
                      </span>
                      <ul className="text-[11px] text-neutral-300 space-y-1 list-disc list-inside">
                        {tpl.scenes.map((scene, idx) => (
                          <li key={idx} className="leading-tight">
                            {scene}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                );
              })}

              {/* 14th Card: Custom Code */}
              <button
                type="button"
                onClick={handleSelectCustomCode}
                className={`text-left p-4 rounded-xl border transition cursor-pointer relative ${
                  selectedTemplateId === 'custom-code'
                    ? 'bg-neutral-800/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Code className="w-4 h-4 text-indigo-400" />
                      Custom Code
                      {selectedTemplateId === 'custom-code' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      )}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Programmatic SVG frame generator with full JS control
                    </p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-md border border-neutral-700 shrink-0 mt-0.5 flex items-center justify-center bg-indigo-600/30 text-indigo-300 font-mono text-[11px] font-bold"
                    title="Custom Code </>"
                  >
                    &lt;/&gt;
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/80">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Animated Scene Sections:
                  </span>
                  <ul className="text-[11px] text-neutral-300 space-y-1 list-disc list-inside">
                    <li className="leading-tight">Custom JS code returning complete &lt;svg&gt; per frame</li>
                    <li className="leading-tight">Access frame, totalFrames, W, H, &amp; ctx runtime</li>
                    <li className="leading-tight">Built-in 14-component HUD &amp; motion overlay library</li>
                  </ul>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Template Controls */}
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-4">
            <h2 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Template Customization
            </h2>

            {/* Custom Title Input */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                <span>Scene Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title text..."
                maxLength={60}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 outline-none transition"
              />
            </div>

            {/* Accent Color Picker & Swatches */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                <span>Accent Color</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-neutral-800 border border-neutral-700 p-0.5"
                  />
                  <span className="text-xs font-mono text-neutral-300">{accent}</span>
                </div>

                <div className="h-6 w-px bg-neutral-800 mx-1" />

                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedTemplate.presetAccents.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setAccent(swatch)}
                      className={`w-6 h-6 rounded-md transition cursor-pointer border ${
                        accent.toLowerCase() === swatch.toLowerCase()
                          ? 'border-white scale-110 shadow-sm'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch }}
                      title={`Select ${swatch}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Custom Code Quick Button if Custom Code is selected */}
            {selectedTemplateId === 'custom-code' && (
              <div className="pt-2 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 rounded-lg text-xs font-semibold text-indigo-300 flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span>Open Custom Code Editor</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Shared Video Settings (Duration, Resolution, FPS) */}
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-4">
            <h2 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              Shared Video Settings
            </h2>

            {/* Video Duration (Slider + Number) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Duration</span>
                </label>
                <span className="text-xs font-mono text-indigo-400 font-semibold tabular-nums">
                  {duration} seconds
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={duration}
                  onChange={(e) => {
                    handleResetPreview();
                    setDuration(parseInt(e.target.value) || 1);
                  }}
                  className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => {
                    handleResetPreview();
                    const val = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                    setDuration(val);
                  }}
                  className="w-14 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
                <span>Range: 1s to 30s</span>
                <span className="font-mono tabular-nums">{totalFrames} frames</span>
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Resolution</span>
              </label>
              <select
                value={resolutionId}
                onChange={(e) => {
                  handleResetPreview();
                  setResolutionId(e.target.value);
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {RESOLUTIONS.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Frame Rate */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span>Frame Rate</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[24, 30, 60].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      handleResetPreview();
                      setFps(rate);
                    }}
                    className={`py-2 text-xs font-medium rounded-lg border transition cursor-pointer ${
                      fps === rate
                        ? 'bg-neutral-800 border-indigo-500 text-white font-semibold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {rate} FPS
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview & Render Pipeline (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-neutral-950 p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Header tabs for Preview: Live View vs Rendered Output */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreviewTab('live')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activePreviewTab === 'live'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900'
                }`}
              >
                Live Preview
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('rendered')}
                disabled={!renderResult}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  activePreviewTab === 'rendered'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900'
                }`}
              >
                Rendered MP4 {renderResult ? '✓' : ''}
              </button>
            </div>

            <div className="text-xs text-neutral-400 font-mono">
              {selectedResolution.width} × {selectedResolution.height} · {fps} FPS
            </div>
          </div>

          {/* Custom Code Execution Error Banner */}
          {customCodeError && (
            <div className="p-3 bg-red-950/80 border border-red-700/80 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2.5 shadow-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-red-300">Custom Code Error: </span>
                  <span className="font-mono text-[11px] break-all">{customCodeError}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(true)}
                  className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-100 rounded text-[11px] font-medium transition cursor-pointer"
                >
                  Edit Code
                </button>
                <button
                  type="button"
                  onClick={() => setCustomCodeError(null)}
                  className="text-red-400 hover:text-red-200 p-0.5 transition cursor-pointer"
                  title="Dismiss error"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Preview Container */}
          <div className="flex-1 min-h-[360px] max-h-[560px] bg-neutral-900/60 rounded-2xl border border-neutral-800 flex items-center justify-center relative overflow-hidden shadow-inner p-2 sm:p-4">
            {activePreviewTab === 'live' ? (
              <div
                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain"
                dangerouslySetInnerHTML={{ __html: currentFrameSvg }}
              />
            ) : renderResult ? (
              <video
                ref={videoPlayerRef}
                src={renderResult.url}
                controls
                loop
                className="w-full h-full max-h-[500px] object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center text-neutral-500 text-xs">
                No rendered video yet. Click "Render Remotion Video" below.
              </div>
            )}
          </div>

          {/* Interactive Scrub Bar & Playback Controls */}
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300">
                {previewTime.toFixed(2)}s / {duration.toFixed(2)}s
              </span>
              <span className="text-indigo-400">
                Frame {currentFrameIndex} of {totalFrames}
              </span>
            </div>

            {/* Scrub Slider */}
            <input
              type="range"
              min="0"
              max={duration}
              step="0.01"
              value={previewTime}
              onChange={(e) => {
                setIsPlaying(false);
                setPreviewTime(parseFloat(e.target.value));
              }}
              className="w-full accent-indigo-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />

            {/* Playback Buttons */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleResetPreview}
                title="Reset to 0s"
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play Live'}</span>
              </button>
            </div>
          </div>

          {/* Render Progress Overlay */}
          {isRendering && renderProgress && (
            <div className="p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-200 font-medium">{renderProgress.statusText}</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {renderProgress.percent}%
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${renderProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>
                  {renderProgress.phase === 'preparing'
                    ? 'Rasterizing vector frames to bitmaps'
                    : 'Encoding H.264 MP4 via WebCodecs'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelRender}
                  className="text-red-400 hover:text-red-300 font-medium cursor-pointer"
                >
                  Cancel Render
                </button>
              </div>
            </div>
          )}

          {/* Render Error Banner */}
          {renderError && (
            <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2.5 shadow-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-red-300">Render Error: </span>
                  <span className="font-mono text-[11px] break-all">{renderError}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRenderError(null)}
                className="text-red-400 hover:text-red-200 p-0.5 transition cursor-pointer"
                title="Dismiss error"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Primary Render Action Buttons */}
          <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleStartRender}
              disabled={isRendering || !browserCheck.supported}
              className="w-full sm:flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
            >
              <Video className="w-4 h-4" />
              <span>
                {isRendering
                  ? 'Rendering Remotion Video...'
                  : `Render Remotion Video (${totalFrames} frames)`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadVideo}
              disabled={!renderResult || isRendering}
              className={`w-full sm:w-auto py-3 px-6 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm ${
                renderResult && !isRendering
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/20'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/60'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                Download {renderResult ? `.${renderResult.filename.split('.').pop()}` : 'Video'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Code Editor Modal Popup */}
      {isCodeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCodeModalOpen(false);
            }
          }}
        >
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Code className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    CUSTOM CODE EDITOR
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Write JavaScript to generate vector SVG frames. Purely deterministic and duration-relative.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                title="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Validation Status Banner */}
              {validationStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition ${
                    validationStatus.type === 'success'
                      ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-200'
                      : 'bg-red-950/70 border-red-700/80 text-red-200'
                  }`}
                >
                  {validationStatus.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-mono text-[11px] break-all">
                    {validationStatus.message}
                  </span>
                </div>
              )}

              {/* Monospace Code Editor Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                  <span>// frame: 0..{totalFrames - 1}, W: {selectedResolution.width}, H: {selectedResolution.height}</span>
                  <span className="text-[11px] text-neutral-500">Return complete &lt;svg&gt; string</span>
                </div>
                <textarea
                  value={codeDraft}
                  onChange={(e) => {
                    setCodeDraft(e.target.value);
                    if (validationStatus) setValidationStatus(null);
                  }}
                  rows={14}
                  spellCheck={false}
                  placeholder="// Enter code returning <svg>..."
                  className="w-full font-mono text-xs bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-emerald-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed resize-y selection:bg-indigo-600/40"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleValidateCode}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-neutral-700 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Validate Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyAndPreview}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply &amp; Preview</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetToStarter}
                  className="px-3 py-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to starter</span>
                </button>
              </div>

              {/* Collapsible API Reference */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                <button
                  type="button"
                  onClick={() => setIsApiRefOpen((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition cursor-pointer bg-neutral-900/60"
                >
                  <span className="flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    API Reference &amp; Overlay Library Contract
                  </span>
                  {isApiRefOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </button>

                {isApiRefOpen && (
                  <div className="p-4 space-y-3.5 text-xs text-neutral-300 border-t border-neutral-800/80 bg-neutral-950/70 font-sans">
                    <div>
                      <div className="font-semibold text-indigo-300 mb-1">Function Signature:</div>
                      <code className="block bg-neutral-900 border border-neutral-800 rounded p-2 text-neutral-300 font-mono text-[11px]">
                        (frame, totalFrames, W, H, ctx) =&gt; string
                      </code>
                    </div>

                    <div>
                      <div className="font-semibold text-indigo-300 mb-1">Available Parameters:</div>
                      <ul className="space-y-1 list-disc list-inside font-mono text-[11px] text-neutral-300">
                        <li><span className="text-white">frame</span>: 0-based frame index (0 .. totalFrames - 1)</li>
                        <li><span className="text-white">totalFrames</span>: Total frames for chosen duration and FPS</li>
                        <li><span className="text-white">W, H</span>: Canvas width and height in pixels (e.g. 1920 × 1080)</li>
                        <li><span className="text-white">ctx</span>: Context bundle containing title, accent, easing math, seeded PRNG, and overlays</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-semibold text-indigo-300 mb-1">ctx Object Helpers:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-neutral-300">
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-amber-400 font-semibold">ctx.title</span>: Scene title string
                        </div>
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-amber-400 font-semibold">ctx.accent</span>: Brand accent hex code
                        </div>
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-cyan-400 font-semibold">ctx.ease(t)</span>: Smoothstep ease curve
                        </div>
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-cyan-400 font-semibold">ctx.easeOut(t)</span>: Quadratic ease-out curve
                        </div>
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-cyan-400 font-semibold">ctx.easeInOut(t)</span>: Quadratic ease-in-out curve
                        </div>
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-cyan-400 font-semibold">ctx.clamp(v, min, max)</span>: Clamps number in range
                        </div>
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-cyan-400 font-semibold">ctx.lerp(a, b, t)</span>: Linear interpolation
                        </div>
                        <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-cyan-400 font-semibold">ctx.TAU</span>: Constant 2π (6.28318...)
                        </div>
                        <div className="sm:col-span-2 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                          <span className="text-purple-400 font-semibold">ctx.rand(seedStr)</span>: Seeded deterministic 0..1 PRNG
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-indigo-300 mb-1">Built-in Overlay Library (ctx.O):</div>
                      <div className="bg-neutral-900/90 rounded p-2.5 border border-neutral-800 text-[11px] font-mono text-neutral-300 space-y-1">
                        <div>ctx.O.gridOverlay(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.scanline(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.hudRing(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.dataTicker(frame, totalFrames, W, H, &#123; accent, title &#125;)</div>
                        <div>ctx.O.lowerThird(frame, totalFrames, W, H, &#123; accent, title &#125;)</div>
                        <div>ctx.O.counter(frame, totalFrames, W, H, &#123; accent, title &#125;)</div>
                        <div>ctx.O.barChart(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.lineChart(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.donutChart(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.radarSweep(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.networkNodes(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.particles(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.waveform(frame, totalFrames, W, H, &#123; accent &#125;)</div>
                        <div>ctx.O.kineticTitle(frame, totalFrames, W, H, &#123; title, accent &#125;)</div>
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-neutral-400 space-y-1">
                      <p className="text-amber-300 font-semibold">Strict Rules:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>The code body MUST RETURN a valid complete &lt;svg&gt;...&lt;/svg&gt; string.</li>
                        <li>Animate using <code className="text-neutral-200">frame / totalFrames</code> (duration-relative).</li>
                        <li>NEVER call <code className="text-neutral-200">Math.random()</code> or <code className="text-neutral-200">Date.now()</code>. Use <code className="text-neutral-200">ctx.rand(seed)</code> for pure determinism.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

