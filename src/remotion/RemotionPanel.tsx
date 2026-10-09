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
  Check,
  Palette,
  Type,
  LayoutTemplate,
  AlertCircle,
  XCircle,
  Code,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Package
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

export const STYLE_SNIPPETS: { label: string; snippet: string }[] = [
  { label: 'Grid Overlay', snippet: "s += ctx.O.gridOverlay(frame,totalFrames,W,H,{accent:ctx.accent, seed:'grid1'});\n" },
  { label: 'Scanline', snippet: "s += ctx.O.scanline(frame,totalFrames,W,H,{accent:ctx.accent, seed:'scan1'});\n" },
  { label: 'HUD Ring', snippet: "s += ctx.O.hudRing(frame,totalFrames,W,H,{accent:ctx.accent, seed:'hud1'});\n" },
  { label: 'Data Ticker', snippet: "s += ctx.O.dataTicker(frame,totalFrames,W,H,{accent:ctx.accent, seed:'ticker1'});\n" },
  { label: 'Lower Third', snippet: "s += ctx.O.lowerThird(frame,totalFrames,W,H,{accent:ctx.accent, seed:'l3rd1'});\n" },
  { label: 'Counter', snippet: "s += ctx.O.counter(frame,totalFrames,W,H,{accent:ctx.accent, seed:'cnt1'});\n" },
  { label: 'Bar Chart', snippet: "s += ctx.O.barChart(frame,totalFrames,W,H,{accent:ctx.accent, seed:'bar1'});\n" },
  { label: 'Line Chart', snippet: "s += ctx.O.lineChart(frame,totalFrames,W,H,{accent:ctx.accent, seed:'line1'});\n" },
  { label: 'Donut Chart', snippet: "s += ctx.O.donutChart(frame,totalFrames,W,H,{accent:ctx.accent, seed:'donut1'});\n" },
  { label: 'Radar Sweep', snippet: "s += ctx.O.radarSweep(frame,totalFrames,W,H,{accent:ctx.accent, seed:'radar1'});\n" },
  { label: 'Network Nodes', snippet: "s += ctx.O.networkNodes(frame,totalFrames,W,H,{accent:ctx.accent, seed:'net1'});\n" },
  { label: 'Particles', snippet: "s += ctx.O.particles(frame,totalFrames,W,H,{accent:ctx.accent, seed:'part1'});\n" },
  { label: 'Waveform', snippet: "s += ctx.O.waveform(frame,totalFrames,W,H,{accent:ctx.accent, seed:'wave1'});\n" },
  { label: 'Kinetic Title', snippet: "s += ctx.O.kineticTitle(frame,totalFrames,W,H,{accent:ctx.accent, seed:'title1'});\n" }
];

export const DEFAULT_CUSTOM_CODE = `// Compose background + overlays into a complete SVG frame
let s = '';
s += \`<rect width="\${W}" height="\${H}" fill="#0b0f19" />\`;
s += ctx.O.gridOverlay(frame, totalFrames, W, H, { accent: ctx.accent });
s += ctx.O.kineticTitle(frame, totalFrames, W, H, { title: ctx.title, accent: ctx.accent });
s += ctx.O.barChart(frame, totalFrames, W, H, { accent: ctx.accent });

return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${W} \${H}" width="\${W}" height="\${H}">
  \${s}
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
  // View mode: 'code' (Code Workspace split view), 'templates' (13-template grid), 'template-mode' (normal template mode)
  // Point 1: Remotion tab opens DIRECTLY in Code Workspace split view
  type RemotionView = 'code' | 'templates' | 'template-mode';
  const [viewMode, setViewMode] = useState<RemotionView>('code');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom-code');
  const lastBuiltinTemplateIdRef = useRef<string>(REMOTION_TEMPLATES[0].id);
  const isCustomMode = viewMode === 'code' || selectedTemplateId === 'custom-code' || selectedTemplateId === 'custom';

  const selectedTemplate = useMemo(() => {
    if (isCustomMode) {
      return CUSTOM_CODE_TEMPLATE_META;
    }
    return REMOTION_TEMPLATES.find((t) => t.id === selectedTemplateId) || REMOTION_TEMPLATES[0];
  }, [selectedTemplateId, isCustomMode]);

  // Controls State
  const [title, setTitle] = useState<string>(CUSTOM_CODE_TEMPLATE_META.defaultTitle);
  const [accent, setAccent] = useState<string>(CUSTOM_CODE_TEMPLATE_META.defaultAccent);

  // Custom Code State
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

  // STYLES Dropdown State & Editor Ref
  const [selectedStyleOption, setSelectedStyleOption] = useState<string>('');
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  // Insert style snippet at cursor position
  const handleInsertStyleSnippet = (snippet: string) => {
    if (!snippet) return;
    const textarea = codeEditorRef.current;
    if (!textarea) {
      setCodeDraft((prev) => prev + '\n' + snippet);
      setSelectedStyleOption('');
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const currentVal = textarea.value;
    const newVal = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    setCodeDraft(newVal);
    if (validationStatus) setValidationStatus(null);
    setSelectedStyleOption('');
    setTimeout(() => {
      textarea.focus();
      const newPos = start + snippet.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Open Template Gallery (13 built-in templates only)
  const handleOpenTemplatesGrid = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setCustomCodeError(null);
    setViewMode('templates');
  };

  // When built-in template clicked in grid, open normal template mode
  const handleSelectTemplate = (tpl: RemotionTemplate) => {
    setSelectedTemplateId(tpl.id);
    lastBuiltinTemplateIdRef.current = tpl.id;
    isCustomModeRef.current = false;
    setTitle(tpl.defaultTitle);
    setAccent(tpl.defaultAccent);
    setPreviewTime(0);
    previewTimeRef.current = 0;
    currentFrameRef.current = 0;
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setCustomCodeError(null);
    setRenderError(null);
    setViewMode('template-mode');
  };

  // Return to Code Workspace (with editor content intact)
  const handleBackToCode = () => {
    setViewMode('code');
    setSelectedTemplateId('custom-code');
    isCustomModeRef.current = true;
    setPreviewTime(0);
    previewTimeRef.current = 0;
    currentFrameRef.current = 0;
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setCustomCodeError(null);
    setRenderError(null);
  };

  // Alias for backward compatibility if referenced elsewhere
  const handleSelectCustomCode = handleBackToCode;
  const handleBackToTemplates = handleOpenTemplatesGrid;

  // Live Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;
  const [previewTime, setPreviewTime] = useState<number>(0);
  const [currentFrameSvg, setCurrentFrameSvg] = useState<string>('');
  const animFrameIdRef = useRef<number | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const previewTimeRef = useRef<number>(0);
  previewTimeRef.current = previewTime;
  const currentFrameRef = useRef<number>(0);

  // Synchronized refs for safe frame execution
  const customCodeFnRef = useRef<Function>(customCodeFn);
  customCodeFnRef.current = customCodeFn;
  const isCustomModeRef = useRef<boolean>(isCustomMode);
  isCustomModeRef.current = isCustomMode;
  const titleRef = useRef<string>(title);
  titleRef.current = title;
  const accentRef = useRef<string>(accent);
  accentRef.current = accent;
  const selectedResolutionRef = useRef<RenderResolution>(selectedResolution);
  selectedResolutionRef.current = selectedResolution;
  const durationRef = useRef<number>(duration);
  durationRef.current = duration;
  const totalFramesRef = useRef<number>(totalFrames);
  totalFramesRef.current = totalFrames;
  const selectedTemplateRef = useRef<RemotionTemplate>(selectedTemplate);
  selectedTemplateRef.current = selectedTemplate;

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

  // Safe frame evaluator wrapping every custom code execution in try/catch
  const renderFrameSafe = useCallback((frameIdx: number, timeSec: number): boolean => {
    currentFrameRef.current = frameIdx;
    previewTimeRef.current = timeSec;

    if (isCustomModeRef.current) {
      try {
        const ctx = makeCustomCodeCtx(titleRef.current, accentRef.current);
        const svgStr = customCodeFnRef.current(
          frameIdx,
          totalFramesRef.current,
          selectedResolutionRef.current.width,
          selectedResolutionRef.current.height,
          ctx
        );
        setCurrentFrameSvg(svgStr);
        return true;
      } catch (err: any) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
        currentFrameRef.current = frameIdx;
        const dur = durationRef.current;
        const totalF = totalFramesRef.current;
        const frameTime = totalF <= 1 ? 0 : (frameIdx / totalF) * dur;
        previewTimeRef.current = frameTime;
        setPreviewTime(frameTime);

        const errMsg = `Custom code error at frame ${frameIdx}: ${err.message || String(err)}`;
        setCustomCodeError(errMsg);
        setCurrentFrameSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${selectedResolutionRef.current.width} ${selectedResolutionRef.current.height}" width="${selectedResolutionRef.current.width}" height="${selectedResolutionRef.current.height}">
          <rect width="${selectedResolutionRef.current.width}" height="${selectedResolutionRef.current.height}" fill="#180a0a" />
          <text x="${selectedResolutionRef.current.width / 2}" y="${selectedResolutionRef.current.height / 2 - 20}" fill="#ef4444" font-size="22" font-family="monospace" text-anchor="middle" font-weight="bold">Custom Code Execution Error</text>
          <text x="${selectedResolutionRef.current.width / 2}" y="${selectedResolutionRef.current.height / 2 + 16}" fill="#fca5a5" font-size="14" font-family="monospace" text-anchor="middle">${escapeXmlOverlay(err.message || String(err))}</text>
          <text x="${selectedResolutionRef.current.width / 2}" y="${selectedResolutionRef.current.height / 2 + 54}" fill="#94a3b8" font-size="13" font-family="monospace" text-anchor="middle">Frame ${frameIdx} of ${totalFramesRef.current}</text>
        </svg>`);
        return false;
      }
    } else {
      const dur = durationRef.current;
      const t = dur <= 0 ? 0 : Math.min(dur, Math.max(0, timeSec));
      const svgStr = selectedTemplateRef.current.renderFrame(
        t,
        dur,
        selectedResolutionRef.current.width,
        selectedResolutionRef.current.height,
        { title: titleRef.current, accent: accentRef.current }
      );
      setCurrentFrameSvg(svgStr);
      return true;
    }
  }, []);

  // Update preview when paused and parameters change
  useEffect(() => {
    if (!isPlaying) {
      renderFrameSafe(currentFrameIndex, previewTime);
    }
  }, [isPlaying, currentFrameIndex, previewTime, title, accent, customCodeFn, selectedTemplateId, selectedResolution, duration, renderFrameSafe]);

  // RequestAnimationFrame live preview playback loop
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
      if (!isPlayingRef.current) {
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
        return;
      }

      const dur = durationRef.current;
      const totalF = totalFramesRef.current;
      if (dur <= 0 || totalF <= 0) return;

      const deltaSec = (now - lastPlayTimeRef.current) / 1000;
      lastPlayTimeRef.current = now;

      let nextTime = previewTimeRef.current + deltaSec;
      if (nextTime >= dur) {
        nextTime = nextTime % dur;
      }
      previewTimeRef.current = nextTime;
      setPreviewTime(nextTime);

      const targetFrame = Math.min(totalF - 1, Math.max(0, Math.floor((nextTime / dur) * totalF)));
      const lastFrame = currentFrameRef.current;

      // In the live preview loop, wrap EVERY invocation of the compiled custom-code frame renderer in try/catch.
      // Every frame index between lastFrame and targetFrame is evaluated so no frame is skipped.
      const framesToProcess: number[] = [];
      if (targetFrame >= lastFrame) {
        for (let f = lastFrame + 1; f <= targetFrame; f++) {
          framesToProcess.push(f);
        }
      } else {
        // Wrapped around loop
        for (let f = lastFrame + 1; f < totalF; f++) {
          framesToProcess.push(f);
        }
        for (let f = 0; f <= targetFrame; f++) {
          framesToProcess.push(f);
        }
      }
      if (framesToProcess.length === 0) {
        framesToProcess.push(targetFrame);
      }

      for (const f of framesToProcess) {
        const frameTime = (f / totalF) * dur;
        const ok = renderFrameSafe(f, frameTime);
        if (!ok) {
          // Playback stopped immediately on error at frame f!
          return;
        }
      }

      if (!isPlayingRef.current) {
        return;
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isPlaying, renderFrameSafe]);

  // Handle Play / Pause Toggle
  const togglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next;
      if (next) {
        setCustomCodeError(null);
        setRenderError(null);
        lastPlayTimeRef.current = performance.now();
      }
      return next;
    });
  };

  const handleResetPreview = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setPreviewTime(0);
    previewTimeRef.current = 0;
    currentFrameRef.current = 0;
    setCustomCodeError(null);
    setRenderError(null);
    renderFrameSafe(0, 0);
  };

  const handleScrub = (newT: number) => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setPreviewTime(newT);
    previewTimeRef.current = newT;
    const targetF = totalFrames <= 1 ? 0 : Math.min(totalFrames - 1, Math.max(0, Math.floor((newT / duration) * totalFrames)));
    currentFrameRef.current = targetF;
    renderFrameSafe(targetF, newT);
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
      customCodeFnRef.current = res.fn!;
      setSelectedTemplateId('custom-code');
      isCustomModeRef.current = true;
      setCustomCodeError(null);
      setRenderError(null);
      setPreviewTime(0);
      previewTimeRef.current = 0;
      currentFrameRef.current = 0;
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      renderFrameSafe(0, 0);
    } else {
      setValidationStatus({ type: 'error', message: res.error || 'Cannot apply invalid code' });
    }
  };

  const handleResetToStarter = () => {
    setCodeDraft(DEFAULT_CUSTOM_CODE);
    setValidationStatus(null);
    setCustomCodeError(null);
    setSelectedStyleOption('');
  };

  // Render Remotion Video to MP4
  const handleStartRender = async () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsRendering(true);
    setRenderError(null);
    setCustomCodeError(null);
    setRenderResult(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const tpl = selectedTemplate;
    const currentTitle = title;
    const currentAccent = accent;
    const width = selectedResolution.width;
    const height = selectedResolution.height;

    try {
      const result = await renderSvgFramesToVideo({
        getFrameSvg: (frameIdx, totalF) => {
          if (isCustomMode) {
            try {
              const ctx = makeCustomCodeCtx(currentTitle, currentAccent);
              return customCodeFnRef.current(frameIdx, totalF, width, height, ctx);
            } catch (err: any) {
              const errMsg = `Custom code error at frame ${frameIdx}: ${err.message || String(err)}`;
              throw new Error(errMsg);
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
        const msg = err.message || 'An error occurred during Remotion video render.';
        if (msg.startsWith('Custom code error at frame')) {
          setCustomCodeError(msg);
        } else {
          setRenderError(msg);
        }
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
      {/* Top Banner */}
      <div className="bg-indigo-950/40 border-b border-indigo-800/40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {viewMode === 'code' ? (
            <Code className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400" />
          )}
          <span className="text-xs font-semibold text-neutral-200">
            {viewMode === 'code'
              ? 'Remotion Code Workspace — Custom SVG Motion Studio'
              : viewMode === 'templates'
              ? 'Remotion Template Gallery — 13 Built-in Animation Scenes'
              : `Remotion Template: ${selectedTemplate.name}`}
          </span>
          <span className="text-[11px] text-neutral-400 hidden md:inline">
            {viewMode === 'code'
              ? '— Full JS editor compiling frame-by-frame vector graphics directly to MP4'
              : '— 100% deterministic SVG frame generator rendered directly to MP4'}
          </span>
        </div>
        {viewMode === 'code' ? (
          <button
            type="button"
            onClick={handleOpenTemplatesGrid}
            className="text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700/60 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-indigo-400" />
            <span>Templates (13 Available)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleBackToCode}
            className="text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-900/50 hover:bg-indigo-900/80 px-2.5 py-1 rounded border border-indigo-700/60 flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Code</span>
          </button>
        )}
      </div>

      {viewMode === 'code' ? (
        /* ========================================================
           CUSTOM CODE WORKSPACE: DEDICATED FULL-WIDTH SPLIT VIEW
           ======================================================== */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT PANEL: ONLY Code Features (6 cols) */}
          <div className="lg:col-span-6 border-r border-neutral-800 flex flex-col bg-neutral-900/40 p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* Top row: Templates button & Workspace badge */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <button
                type="button"
                onClick={handleOpenTemplatesGrid}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer shadow-sm"
              >
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span>Templates</span>
              </button>

              <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded">
                <Code className="w-3 h-3" />
                <span>Code Workspace Active</span>
              </div>
            </div>

            {/* STYLES dropdown above code editor */}
            <div className="flex items-center justify-between gap-3 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2 flex-1">
                <label
                  htmlFor="styles-dropdown"
                  className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>STYLES:</span>
                </label>
                <select
                  id="styles-dropdown"
                  value={selectedStyleOption}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      handleInsertStyleSnippet(val);
                    }
                  }}
                  className="bg-neutral-900 border border-neutral-700/80 text-xs text-indigo-300 rounded-lg px-2.5 py-1.5 font-medium focus:border-indigo-500 outline-none cursor-pointer hover:bg-neutral-800 transition max-w-[220px]"
                >
                  <option value="" disabled>
                    + Insert style...
                  </option>
                  {STYLE_SNIPPETS.map((item) => (
                    <option key={item.label} value={item.snippet} className="bg-neutral-900 text-neutral-200">
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
                14 overlays via ctx.O
              </span>
            </div>

            {/* Compact row: Title text input + Accent color picker */}
            <div className="flex items-center gap-3 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800">
              <div className="flex-1 flex items-center gap-2">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Type className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Title:</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Scene title (ctx.title)..."
                  maxLength={60}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 outline-none transition font-medium"
                />
              </div>

              <div className="h-6 w-px bg-neutral-800" />

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Accent:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-neutral-800 border border-neutral-700 p-0.5"
                  />
                  <span className="text-xs font-mono text-neutral-300 hidden sm:inline">{accent}</span>
                </div>
              </div>
            </div>

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

            {/* Large monospace code editor textarea (tall, fills available height) */}
            <div className="flex-1 flex flex-col min-h-[300px] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>// frame: 0..{totalFrames - 1}, W: {selectedResolution.width}, H: {selectedResolution.height}</span>
                <span className="text-neutral-500">Return complete &lt;svg&gt; string</span>
              </div>
              <textarea
                ref={codeEditorRef}
                value={codeDraft}
                onChange={(e) => {
                  setCodeDraft(e.target.value);
                  if (validationStatus) setValidationStatus(null);
                }}
                spellCheck={false}
                placeholder="// Enter code returning <svg>..."
                className="flex-1 min-h-[260px] w-full font-mono text-xs bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-emerald-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed resize-y selection:bg-indigo-600/40"
              />
            </div>

            {/* Action Buttons: Validate Code, Apply & Preview, Reset to starter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleValidateCode}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-neutral-700 cursor-pointer"
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

            {/* Collapsible API Reference & Overlay Library section */}
            <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
              <button
                type="button"
                onClick={() => setIsApiRefOpen((prev) => !prev)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition cursor-pointer bg-neutral-900/60"
              >
                <span className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                  API Reference &amp; Overlay Library
                </span>
                {isApiRefOpen ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {isApiRefOpen && (
                <div className="p-4 space-y-3 text-xs text-neutral-300 border-t border-neutral-800/80 bg-neutral-950/70 font-sans">
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

          {/* RIGHT PANEL: Video Output Only (6 cols) */}
          <div className="lg:col-span-6 flex flex-col bg-neutral-950 p-4 sm:p-5 space-y-4 overflow-y-auto">
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

            {/* Large live preview player container */}
            <div className="flex-1 min-h-[340px] max-h-[520px] bg-neutral-900/60 rounded-2xl border border-neutral-800 flex items-center justify-center relative overflow-hidden shadow-inner p-2 sm:p-4">
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
                  className="w-full h-full max-h-[480px] object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-neutral-500 text-xs">
                  No rendered video yet. Click "Render Remotion Video" below.
                </div>
              )}
            </div>

            {/* Scrub bar & playback controls */}
            <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-300">
                  {previewTime.toFixed(2)}s / {duration.toFixed(2)}s
                </span>
                <span className="text-indigo-400">
                  Frame {currentFrameIndex} of {totalFrames}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max={duration}
                step="0.01"
                value={previewTime}
                onChange={(e) => {
                  handleScrub(parseFloat(e.target.value));
                }}
                className="w-full accent-indigo-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
              />

              <div className="flex items-center justify-center gap-3 pt-0.5">
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

            {/* Error Banner Area: Custom Code Error & Render Error (No modal re-open button) */}
            {customCodeError && (
              <div className="p-3 bg-red-950/80 border border-red-700/80 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2.5 shadow-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-mono text-xs break-all">{customCodeError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomCodeError(null)}
                  className="text-red-400 hover:text-red-200 p-0.5 transition cursor-pointer"
                  title="Dismiss error"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {renderError && (
              <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2.5 shadow-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-mono text-xs break-all">{renderError}</span>
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

            {/* Render Controls Area */}
            <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3.5">
              <h2 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                Render Settings &amp; Output
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

              {/* Resolution & FPS Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-neutral-800/80">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Resolution</span>
                  </label>
                  <select
                    value={resolutionId}
                    onChange={(e) => {
                      handleResetPreview();
                      setResolutionId(e.target.value);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    {RESOLUTIONS.map((res) => (
                      <option key={res.id} value={res.id}>
                        {res.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Frame Rate</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[24, 30, 60].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          handleResetPreview();
                          setFps(rate);
                        }}
                        className={`py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
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

            {/* Action Buttons: Render & Download */}
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
      ) : viewMode === 'templates' ? (
        /* ========================================================
           2. TEMPLATE PICKER GRID: ONLY 13 BUILT-IN TEMPLATES
           ======================================================== */
        <div className="flex-1 flex flex-col min-h-0 bg-neutral-950/40 p-4 sm:p-6 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToCode}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Code</span>
              </button>

              <div className="h-5 w-px bg-neutral-800 hidden sm:block" />

              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs sm:text-sm font-bold text-neutral-100 uppercase tracking-wider">
                  SELECT REMOTION TEMPLATE (13 AVAILABLE)
                </h2>
              </div>
            </div>

            <span className="text-[11px] text-neutral-400 hidden md:inline">
              Choose from 13 built-in motion graphic templates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {REMOTION_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className="text-left p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-indigo-500/60 transition cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md hover:shadow-indigo-500/5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                      {tpl.name}
                    </h3>
                    <div
                      className="w-4 h-4 rounded-full border border-neutral-700 shrink-0 mt-0.5"
                      style={{ backgroundColor: tpl.defaultAccent }}
                      title="Template primary color"
                    />
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2">{tpl.tagline}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/80">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Animated Scene Sections:
                  </span>
                  <ul className="text-[11px] text-neutral-300 space-y-1 list-disc list-inside">
                    {tpl.scenes.slice(0, 4).map((scene, idx) => (
                      <li key={idx} className="leading-tight truncate">
                        {scene}
                      </li>
                    ))}
                    {tpl.scenes.length > 4 && (
                      <li className="text-[10px] text-neutral-500 list-none pt-0.5">
                        +{tpl.scenes.length - 4} more animated sections
                      </li>
                    )}
                  </ul>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================
           3. NORMAL TEMPLATE MODE (CUSTOMIZATION + PREVIEW + RENDER)
           ======================================================== */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Column: Template Selection & Controls (5 cols) */}
          <div className="lg:col-span-5 border-r border-neutral-800 flex flex-col bg-neutral-900/30 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Top Navigation Row: Back to Code + All Templates buttons */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackToCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-700/60 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Code</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenTemplatesGrid}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-indigo-400" />
                  <span>All Templates</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-neutral-400 truncate max-w-[160px]" title={selectedTemplate.name}>
                {selectedTemplate.name}
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
                  handleScrub(parseFloat(e.target.value));
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

            {/* Error Banner Area */}
            {customCodeError && (
              <div className="p-3 bg-red-950/80 border border-red-700/80 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2.5 shadow-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-mono text-xs break-all">{customCodeError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomCodeError(null)}
                  className="text-red-400 hover:text-red-200 p-0.5 transition cursor-pointer"
                  title="Dismiss error"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {renderError && (
              <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2.5 shadow-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-mono text-xs break-all">{renderError}</span>
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
      )}
    </div>
  );
};
