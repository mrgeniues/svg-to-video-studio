/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Download,
  Code2,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  AlertCircle,
  FileDown,
  Upload,
  Copy,
  Check,
  Trash2,
  Maximize2,
  Film,
  XCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { SAMPLE_SVGS, SvgSample } from './constants/samples';
import {
  AnimationStyle,
  validateSvg,
  measureSvgGeometries,
  renderAnimatedSvgString,
  SvgValidationResult
} from './utils/animator';
import {
  RESOLUTIONS,
  RenderResolution,
  RenderProgress,
  RenderResult,
  BackgroundSource,
  checkBrowserCapabilities,
  getBestSupportedVideoMimeType,
  renderSvgToVideo,
  rasterizeSvgToBitmap
} from './utils/renderer';
import { generateStandaloneHtml } from './utils/standaloneHtml';

export default function App() {
  // SVG State
  const [svgCode, setSvgCode] = useState<string>(SAMPLE_SVGS[0].code);
  const [activeSampleIndex, setActiveSampleIndex] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Animation & Video Configuration
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('draw-on');
  const [duration, setDuration] = useState<number>(5);
  const [spinCount, setSpinCount] = useState<number>(() => Math.max(1, Math.round(5 / 2)));
  const [isCustomSpinCount, setIsCustomSpinCount] = useState<boolean>(false);
  const [resolutionId, setResolutionId] = useState<string>('1080p');
  const [fps, setFps] = useState<number>(30);
  const [pulseCount, setPulseCount] = useState<number>(4);
  const [backgroundSource, setBackgroundSource] = useState<BackgroundSource>('svg');
  const [backgroundColor, setBackgroundColor] = useState<string>('#0f172a');
  const [isTransparent, setIsTransparent] = useState<boolean>(false);

  // Playback & Live Preview State
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [isBufferingPreview, setIsBufferingPreview] = useState<boolean>(false);
  const [previewBufferProgress, setPreviewBufferProgress] = useState<number>(0);
  const [previewTime, setPreviewTime] = useState<number>(0); // in seconds

  // Rendering State
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Active Tab for Preview Area: 'live' or 'rendered'
  const [activeViewTab, setActiveViewTab] = useState<'live' | 'rendered'>('live');

  // Help Modal State
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // DOM & Animation Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview pre-rendered frames cache & loop control
  const previewFramesRef = useRef<ImageBitmap[]>([]);
  const previewCacheKeyRef = useRef<string>('');
  const previewAbortRef = useRef<boolean>(false);

  // Browser capability and format detection
  const browserCheck = useMemo(() => checkBrowserCapabilities(), []);
  const detectedFormat = useMemo(() => getBestSupportedVideoMimeType(), []);

  // Selected Resolution
  const selectedResolution = useMemo(
    () => RESOLUTIONS.find((r) => r.id === resolutionId) || RESOLUTIONS[0],
    [resolutionId]
  );

  // Total frames for current duration and fps
  const totalFrames = Math.max(2, Math.round(duration * fps));
  const isHighFrameCount = totalFrames > 1800;

  // Validate current SVG code
  const validation: SvgValidationResult = useMemo(() => {
    return validateSvg(svgCode);
  }, [svgCode]);

  // Geometry measurements for draw-on animation
  const precomputedGeometries = useMemo(() => {
    if (!validation.valid) return undefined;
    try {
      return measureSvgGeometries(svgCode);
    } catch {
      return undefined;
    }
  }, [svgCode, validation.valid]);

  // Keep line numbers scrolled in sync with the textarea
  const handleEditorScroll = () => {
    if (editorRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop;
    }
  };

  // Generate line numbers text
  const lineNumbers = useMemo(() => {
    const lines = svgCode.split('\n').length;
    return Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1);
  }, [svgCode]);

  // Clean preview cache
  const invalidatePreviewCache = useCallback(() => {
    previewFramesRef.current.forEach((f) => {
      try {
        f.close();
      } catch {}
    });
    previewFramesRef.current = [];
    previewCacheKeyRef.current = '';
  }, []);

  // Compute preview cache key based on all parameters affecting frames
  const currentPreviewKey = useMemo(() => {
    return `${svgCode}|${animationStyle}|${duration}|${fps}|${backgroundColor}|${isTransparent}|${spinCount}|${pulseCount}|${backgroundSource}`;
  }, [svgCode, animationStyle, duration, fps, backgroundColor, isTransparent, spinCount, pulseCount, backgroundSource]);

  // Invalidate preview cache whenever key parameters change
  useEffect(() => {
    invalidatePreviewCache();
  }, [currentPreviewKey, invalidatePreviewCache]);

  // Draw current frame onto the preview canvas
  const drawSinglePreviewFrame = useCallback(
    async (t: number) => {
      const canvas = previewCanvasRef.current;
      if (!canvas || !validation.valid) return;

      const aspect = selectedResolution.width / selectedResolution.height;
      const previewW = aspect >= 1 ? 640 : Math.round(360 * aspect);
      const previewH = aspect >= 1 ? Math.round(640 / aspect) : 360;
      if (canvas.width !== previewW || canvas.height !== previewH) {
        canvas.width = previewW;
        canvas.height = previewH;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const frameIdx = Math.min(totalFrames - 1, Math.max(0, Math.round(t * (totalFrames - 1))));

      // If pre-rendered preview frames are ready in memory, blit directly
      if (
        previewFramesRef.current.length === totalFrames &&
        previewCacheKeyRef.current === currentPreviewKey
      ) {
        ctx.clearRect(0, 0, previewW, previewH);
        ctx.drawImage(previewFramesRef.current[frameIdx], 0, 0, previewW, previewH);
        return;
      }

      // Otherwise rasterize single static frame on demand for live responsive feedback
      try {
        const baseSvg = precomputedGeometries ? precomputedGeometries.sanitizedSvg : svgCode;
        const measurements = precomputedGeometries ? precomputedGeometries.measurements : undefined;
        const frameSvg = renderAnimatedSvgString(
          baseSvg,
          animationStyle,
          t,
          duration,
          measurements,
          spinCount,
          pulseCount
        );
        const bitmap = await rasterizeSvgToBitmap(
          frameSvg,
          previewW,
          previewH,
          backgroundColor,
          isTransparent,
          backgroundSource
        );
        ctx.clearRect(0, 0, previewW, previewH);
        ctx.drawImage(bitmap, 0, 0, previewW, previewH);
        bitmap.close();
      } catch (err) {
        console.warn('Preview render error:', err);
      }
    },
    [
      validation.valid,
      selectedResolution.width,
      selectedResolution.height,
      totalFrames,
      currentPreviewKey,
      precomputedGeometries,
      svgCode,
      animationStyle,
      duration,
      spinCount,
      pulseCount,
      backgroundColor,
      isTransparent,
      backgroundSource
    ]
  );

  // Redraw preview whenever scrubber or static parameters change (when not playing)
  useEffect(() => {
    if (!isPlayingPreview && !isBufferingPreview) {
      const normalizedT = duration <= 0 ? 0 : previewTime / duration;
      drawSinglePreviewFrame(normalizedT);
    }
  }, [previewTime, duration, isPlayingPreview, isBufferingPreview, drawSinglePreviewFrame]);

  // Pre-render preview frames into memory
  const ensurePreviewFrames = useCallback(async (): Promise<ImageBitmap[]> => {
    if (
      previewFramesRef.current.length === totalFrames &&
      previewCacheKeyRef.current === currentPreviewKey
    ) {
      return previewFramesRef.current;
    }

    invalidatePreviewCache();
    setIsBufferingPreview(true);
    setPreviewBufferProgress(0);

    const baseSvg = precomputedGeometries ? precomputedGeometries.sanitizedSvg : svgCode;
    const measurements = precomputedGeometries ? precomputedGeometries.measurements : undefined;
    const aspect = selectedResolution.width / selectedResolution.height;
    const previewW = aspect >= 1 ? 640 : Math.round(360 * aspect);
    const previewH = aspect >= 1 ? Math.round(640 / aspect) : 360;
    const frames: ImageBitmap[] = [];

    try {
      for (let i = 0; i < totalFrames; i++) {
        if (previewAbortRef.current) {
          frames.forEach((f) => {
            try { f.close(); } catch {}
          });
          throw new Error('Preview buffering aborted');
        }

        const t = totalFrames <= 1 ? 1 : i / (totalFrames - 1);
        const frameSvg = renderAnimatedSvgString(
          baseSvg,
          animationStyle,
          t,
          duration,
          measurements,
          spinCount,
          pulseCount
        );

        const bitmap = await rasterizeSvgToBitmap(
          frameSvg,
          previewW,
          previewH,
          backgroundColor,
          isTransparent,
          backgroundSource
        );
        frames.push(bitmap);

        if ((i + 1) % 5 === 0 || i === totalFrames - 1) {
          setPreviewBufferProgress(Math.round(((i + 1) / totalFrames) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      previewFramesRef.current = frames;
      previewCacheKeyRef.current = currentPreviewKey;
      return frames;
    } finally {
      setIsBufferingPreview(false);
    }
  }, [
    totalFrames,
    currentPreviewKey,
    invalidatePreviewCache,
    precomputedGeometries,
    svgCode,
    animationStyle,
    duration,
    spinCount,
    pulseCount,
    backgroundColor,
    isTransparent,
    backgroundSource
  ]);

  // Drift-compensated preview playback loop
  const startPreviewPlayback = useCallback(async () => {
    previewAbortRef.current = false;
    let frames: ImageBitmap[] = [];

    try {
      frames = await ensurePreviewFrames();
    } catch {
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameIntervalMs = 1000 / fps;
    let startFrame = Math.round((previewTime / duration) * (totalFrames - 1));
    if (startFrame >= totalFrames - 1) startFrame = 0;

    let next = performance.now();

    while (!previewAbortRef.current) {
      for (let i = startFrame; i < totalFrames; i++) {
        if (previewAbortRef.current) break;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height);

        const currentT = i / (totalFrames - 1);
        setPreviewTime(currentT * duration);

        next += frameIntervalMs;
        const delay = Math.max(0, next - performance.now());
        await new Promise((r) => setTimeout(r, delay));
      }
      startFrame = 0;
      next = performance.now();
    }

    setIsPlayingPreview(false);
  }, [ensurePreviewFrames, fps, previewTime, duration, totalFrames]);

  // Handle Play/Pause Live Animation Preview
  const handleTogglePreview = () => {
    if (isPlayingPreview || isBufferingPreview) {
      previewAbortRef.current = true;
      setIsPlayingPreview(false);
      setIsBufferingPreview(false);
    } else {
      setActiveViewTab('live');
      startPreviewPlayback();
    }
  };

  // Reset animation preview to 0.0s
  const handleResetPreview = () => {
    previewAbortRef.current = true;
    setIsPlayingPreview(false);
    setIsBufferingPreview(false);
    setPreviewTime(0);
  };

  // Cleanup preview frames on unmount
  useEffect(() => {
    return () => {
      previewAbortRef.current = true;
      invalidatePreviewCache();
    };
  }, [invalidatePreviewCache]);

  // Handle Escape key to close Help modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHelpOpen) {
        setIsHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen]);

  // Load sample SVG
  const handleLoadSample = (sample?: SvgSample) => {
    handleResetPreview();
    setIsCustomSpinCount(false);
    setSpinCount(Math.max(1, Math.round(duration / 2)));
    let nextIndex = activeSampleIndex;
    if (!sample) {
      nextIndex = (activeSampleIndex + 1) % SAMPLE_SVGS.length;
      sample = SAMPLE_SVGS[nextIndex];
    } else {
      nextIndex = SAMPLE_SVGS.findIndex((s) => s.id === sample!.id);
    }
    setActiveSampleIndex(nextIndex);
    setSvgCode(sample.code);
    setAnimationStyle(sample.recommendedAnimation);
  };

  // Clear Editor
  const handleClearCode = () => {
    handleResetPreview();
    setSvgCode('');
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Upload local .svg file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleResetPreview();
        setSvgCode(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Two-Phase Video Rendering
  const handleStartRender = async () => {
    // Validate SVG before starting
    const currentValidation = validateSvg(svgCode);
    if (!currentValidation.valid) {
      setRenderError(currentValidation.error || 'Invalid SVG code. Please fix syntax errors before rendering.');
      return;
    }

    // Stop live preview
    previewAbortRef.current = true;
    setIsPlayingPreview(false);
    setIsBufferingPreview(false);

    // Enter rendering state immediately
    setIsRendering(true);
    setRenderError(null);
    setRenderProgress({
      phase: 'preparing',
      currentFrame: 0,
      totalFrames,
      percent: 0,
      statusText: `Preparing frame 1 of ${totalFrames}...`,
      elapsedMs: 0,
      estimatedRemainingMs: 0
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await renderSvgToVideo({
        svgCode,
        animationStyle,
        duration,
        fps,
        width: selectedResolution.width,
        height: selectedResolution.height,
        backgroundColor,
        isTransparent,
        backgroundSource,
        spinCount,
        pulseCount,
        onProgress: (progress) => {
          setRenderProgress(progress);
        },
        signal: abortController.signal
      });

      setRenderResult(result);
      setActiveViewTab('rendered');
      setTimeout(() => {
        if (videoPlayerRef.current) {
          videoPlayerRef.current.currentTime = 0;
          videoPlayerRef.current.play().catch(() => {});
        }
      }, 150);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setRenderError('Video render was cancelled.');
      } else {
        setRenderError(err.message || 'An error occurred during video rendering.');
      }
    } finally {
      setIsRendering(false);
      abortControllerRef.current = null;
    }
  };

  // Cancel video render
  const handleCancelRender = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Download rendered video file
  const handleDownloadVideo = () => {
    if (!renderResult) return;
    const a = document.createElement('a');
    a.href = renderResult.url;
    a.download = renderResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download standalone offline HTML
  const handleDownloadStandaloneHtml = () => {
    const htmlContent = generateStandaloneHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'svg-to-video-studio.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Bar */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              SVG to Video Studio
            </h1>
            <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
              <span>Pre-rendered Frames Engine</span>
              <span aria-hidden="true">·</span>
              <span>Drift-Compensated</span>
              <span aria-hidden="true">·</span>
              <span className="text-indigo-400 font-mono">
                {detectedFormat.isMp4Supported ? 'MP4 / H.264' : 'WebM'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Bar Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsHelpOpen(true)}
            title="Help & documentation"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 rounded-md transition shadow-sm cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Help</span>
          </button>

          <button
            onClick={handleDownloadStandaloneHtml}
            title="Download self-contained single-file HTML version runnable offline directly in Chrome"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 rounded-md transition shadow-sm cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Standalone HTML</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="hidden md:inline">Ready</span>
          </div>
        </div>
      </header>

      {/* Browser Support Alert */}
      {!browserCheck.supported && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-3 text-xs text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{browserCheck.reason}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Code Editor & Samples (5 cols on desktop) */}
        <section className="lg:col-span-5 border-r border-neutral-800 flex flex-col bg-neutral-900/30 min-h-[460px] lg:min-h-0">
          {/* Editor Header */}
          <div className="px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                SVG Code Editor
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {lineNumbers.length} lines
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload local SVG file"
                className="px-2 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded border border-neutral-700/80 transition flex items-center gap-1"
              >
                <Upload className="w-3 h-3 text-neutral-400" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button
                onClick={handleCopyCode}
                title="Copy SVG to clipboard"
                className="px-2 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded border border-neutral-700/80 transition flex items-center gap-1"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-neutral-400" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleClearCode}
                title="Clear code editor"
                className="px-2 py-1 text-xs text-neutral-400 hover:text-red-300 bg-neutral-800 hover:bg-neutral-700/80 rounded border border-neutral-700/80 transition flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Sample Selector Buttons Bar */}
          <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-medium text-neutral-400 whitespace-nowrap">
              Load Sample:
            </span>
            <div className="flex items-center gap-1.5">
              {SAMPLE_SVGS.map((sample, idx) => {
                const isActive = activeSampleIndex === idx;
                return (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600/90 text-white shadow-sm shadow-indigo-600/30'
                        : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60'
                    }`}
                  >
                    {idx + 1}. {sample.name.split(' ')[0]}
                  </button>
                );
              })}
              <button
                onClick={() => handleLoadSample()}
                title="Cycle through samples"
                className="px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 rounded transition"
              >
                Cycle Next →
              </button>
            </div>
          </div>

          {/* Code Textarea with Synced Line Numbers */}
          <div className="flex-1 flex overflow-hidden relative font-mono text-xs bg-neutral-950/80">
            {/* Line Numbers Gutter */}
            <div
              ref={lineNumbersRef}
              className="w-11 bg-neutral-950 border-r border-neutral-800/80 py-3 text-right pr-2 text-neutral-600 select-none overflow-hidden leading-relaxed shrink-0"
              aria-hidden="true"
            >
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>

            {/* Editable Textarea */}
            <textarea
              ref={editorRef}
              value={svgCode}
              onChange={(e) => {
                handleResetPreview();
                setSvgCode(e.target.value);
              }}
              onScroll={handleEditorScroll}
              spellCheck={false}
              placeholder="Paste raw SVG code here... e.g. <svg viewBox='0 0 100 100'>...</svg>"
              className="flex-1 bg-transparent p-3 text-neutral-200 outline-none resize-none leading-relaxed overflow-auto selection:bg-indigo-500/30 font-mono text-xs border-0 focus:ring-0"
            />
          </div>

          {/* Validation Banner */}
          {!validation.valid && (
            <div className="p-3 bg-red-950/70 border-t border-red-800/80 text-xs text-red-200 flex items-start gap-2.5 shrink-0">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-red-300">Invalid SVG: </span>
                <span className="font-mono text-[11px]">{validation.error}</span>
              </div>
            </div>
          )}

          {/* Valid SVG Info Footer */}
          {validation.valid && (
            <div className="px-4 py-2 border-t border-neutral-800/80 bg-neutral-900/50 flex items-center justify-between text-[11px] text-neutral-400 font-mono shrink-0">
              <div className="flex items-center gap-3">
                <span>
                  viewBox: {validation.viewBox?.width} × {validation.viewBox?.height}
                </span>
                <span aria-hidden="true">·</span>
                <span>{validation.elementCount} elements</span>
              </div>
              <div className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Valid SVG XML</span>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Stage & Controls (7 cols on desktop) */}
        <section className="lg:col-span-7 flex flex-col min-h-0 bg-neutral-950 overflow-y-auto">
          {/* Top Section: Live Stage / Rendered Video View */}
          <div className="p-4 lg:p-6 border-b border-neutral-800 bg-neutral-900/20 flex flex-col items-center shrink-0">
            {/* Stage Viewport Header */}
            <div className="w-full flex items-center justify-between mb-3">
              {/* Segmented Control Tabs */}
              <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
                <button
                  onClick={() => setActiveViewTab('live')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    activeViewTab === 'live'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live Preview (Drift-Free)</span>
                </button>
                <button
                  onClick={() => setActiveViewTab('rendered')}
                  disabled={!renderResult}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    activeViewTab === 'rendered'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : renderResult
                      ? 'text-neutral-400 hover:text-neutral-200'
                      : 'text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Rendered Video {renderResult ? `(${renderResult.filename.split('.').pop()?.toUpperCase()})` : ''}
                  </span>
                </button>
              </div>

              {/* Resolution & FPS indicator */}
              <div className="text-xs text-neutral-400 flex items-center gap-2 font-mono">
                <span>{selectedResolution.label.split(' ')[0]}</span>
                <span aria-hidden="true">·</span>
                <span>{fps} FPS</span>
              </div>
            </div>

            {/* Stage Canvas / Screen Frame */}
            <div
              className={`w-full max-w-xl h-72 sm:h-80 rounded-xl border border-neutral-800 flex items-center justify-center p-6 relative overflow-hidden transition-all shadow-2xl ${
                backgroundSource === 'svg' || isTransparent ? 'checkerboard' : ''
              }`}
              style={{
                backgroundColor: backgroundSource === 'svg' || isTransparent ? 'transparent' : backgroundColor
              }}
            >
              {activeViewTab === 'live' ? (
                /* Live Preview Canvas */
                validation.valid ? (
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full max-h-full object-contain rounded select-none shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-500 gap-2 text-center p-6">
                    <AlertCircle className="w-8 h-8 text-neutral-600" />
                    <span className="text-xs">Correct the SVG syntax on the left to preview</span>
                  </div>
                )
              ) : (
                /* Rendered Video Player */
                renderResult && (
                  <video
                    ref={videoPlayerRef}
                    src={renderResult.url}
                    controls
                    loop
                    playsInline
                    className="w-full h-full object-contain rounded-lg"
                  />
                )
              )}
            </div>

            {/* Playback Scrubber & Controls (Only for Live Preview) */}
            {activeViewTab === 'live' && (
              <div className="w-full max-w-xl mt-3 flex items-center gap-3">
                <button
                  onClick={handleTogglePreview}
                  disabled={!validation.valid}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition border border-neutral-700/60 shadow-sm"
                >
                  {isBufferingPreview ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
                      <span>Buffering {previewBufferProgress}%</span>
                    </>
                  ) : isPlayingPreview ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      <span>Play Preview</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetPreview}
                  title="Reset playhead to 0.0s"
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-md transition border border-neutral-700/60"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Timeline slider */}
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.05"
                  value={previewTime}
                  onChange={(e) => {
                    handleResetPreview();
                    setPreviewTime(parseFloat(e.target.value));
                  }}
                  className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />

                <span className="text-xs font-mono text-neutral-400 w-20 text-right tabular-nums">
                  {previewTime.toFixed(1)}s / {duration}s
                </span>
              </div>
            )}

            {/* Rendered Video Details Bar */}
            {activeViewTab === 'rendered' && renderResult && (
              <div className="w-full max-w-xl mt-3 flex items-center justify-between text-xs text-neutral-400 font-mono">
                <div className="flex items-center gap-2">
                  <span>{renderResult.width} × {renderResult.height}</span>
                  <span aria-hidden="true">·</span>
                  <span>{renderResult.fps} FPS</span>
                  <span aria-hidden="true">·</span>
                  <span>{(renderResult.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-indigo-400 font-medium">
                    {renderResult.engineUsed === 'webcodecs' ? 'WebCodecs Frame-Accurate' : 'MediaRecorder'}
                  </span>
                </div>
                <div className="text-emerald-400 font-semibold uppercase">
                  {renderResult.mimeType.split(';')[0]}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Controls, Parameters & Render Action */}
          <div className="p-4 lg:p-6 flex-1 flex flex-col gap-6 bg-neutral-950">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Animation Style Dropdown & Rotations */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Animation Style</span>
                  </label>
                  {animationStyle === 'spin-continuous' && (
                    <span className="text-xs text-neutral-400 font-mono">
                      {spinCount} {spinCount === 1 ? 'rotation' : 'rotations'}
                    </span>
                  )}
                  {animationStyle === 'pulse' && (
                    <span className="text-xs text-neutral-400 font-mono">
                      {pulseCount} {pulseCount === 1 ? 'pulse' : 'pulses'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={animationStyle}
                    onChange={(e) => {
                      handleResetPreview();
                      setAnimationStyle(e.target.value as AnimationStyle);
                    }}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="draw-on">Draw-on (strokes draw themselves)</option>
                    <option value="pulse">Pulse</option>
                    <option value="progress">Progress</option>
                    <option value="fade-in">Fade in</option>
                    <option value="zoom-in">Zoom in</option>
                    <option value="rotate-in">Rotate in</option>
                    <option value="slide-up">Slide up</option>
                    <option value="pulse-loop">Pulse loop</option>
                    <option value="spin-continuous">Spin (continuous)</option>
                  </select>

                  {/* Pulses number input: visible ONLY when 'Pulse' is selected */}
                  {animationStyle === 'pulse' && (
                    <div className="flex items-center gap-1.5 shrink-0 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5">
                      <label htmlFor="pulsesInput" className="text-[11px] text-neutral-400 whitespace-nowrap">
                        Pulses:
                      </label>
                      <input
                        id="pulsesInput"
                        type="number"
                        min="1"
                        max="10"
                        value={pulseCount}
                        onChange={(e) => {
                          handleResetPreview();
                          const val = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                          setPulseCount(val);
                        }}
                        className="w-12 bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white text-center font-mono focus:border-indigo-500 outline-none"
                        title="Number of continuous opacity pulses (1–10, default 4)"
                      />
                    </div>
                  )}

                  {/* Rotations number input: visible ONLY when 'Spin (continuous)' is selected */}
                  {animationStyle === 'spin-continuous' && (
                    <div className="flex items-center gap-1.5 shrink-0 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5">
                      <label htmlFor="rotationsInput" className="text-[11px] text-neutral-400 whitespace-nowrap">
                        Rotations:
                      </label>
                      <input
                        id="rotationsInput"
                        type="number"
                        min="1"
                        max="10"
                        value={spinCount}
                        onChange={(e) => {
                          handleResetPreview();
                          setIsCustomSpinCount(true);
                          const val = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                          setSpinCount(val);
                        }}
                        className="w-12 bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white text-center font-mono focus:border-indigo-500 outline-none"
                        title="Number of full 360° rotations (1–10)"
                      />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 mt-1">
                  {animationStyle === 'draw-on' && 'Animates strokeDashoffset on all vector paths and lines.'}
                  {animationStyle === 'pulse' && `Continuous opacity pulse (${pulseCount} pulse${pulseCount > 1 ? 's' : ''}), starts fully visible (opacity 1.0) on frame 0.`}
                  {animationStyle === 'progress' && 'Fills #progress-fill width 0→100% and live-updates #progress-text counter.'}
                  {animationStyle === 'fade-in' && 'Smooth cubic opacity transition from 0 to 100%.'}
                  {animationStyle === 'zoom-in' && 'Scales from 20% to 100% centered with cubic ease.'}
                  {animationStyle === 'rotate-in' && 'Rotates 180° into place while expanding.'}
                  {animationStyle === 'slide-up' && 'Slides vertically from bottom with opacity fade.'}
                  {animationStyle === 'pulse-loop' && 'Harmonic sine wave scale pulse looping seamlessly.'}
                  {animationStyle === 'spin-continuous' && `Continuous 360° rotation around frame center (${spinCount} full rotation${spinCount > 1 ? 's' : ''}).`}
                </p>
              </div>

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
                      const val = parseInt(e.target.value) || 1;
                      setDuration(val);
                      if (!isCustomSpinCount) {
                        setSpinCount(Math.max(1, Math.round(val / 2)));
                      }
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
                      if (!isCustomSpinCount) {
                        setSpinCount(Math.max(1, Math.round(val / 2)));
                      }
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
                      className={`py-2 text-xs font-medium rounded-lg border transition ${
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

              {/* Background Source & Color */}
              <div className="md:col-span-2 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-neutral-300 whitespace-nowrap">
                      Background source:
                    </label>
                    <div className="inline-flex rounded-lg p-0.5 bg-neutral-950 border border-neutral-800 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          handleResetPreview();
                          setBackgroundSource('svg');
                        }}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          backgroundSource === 'svg'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        From my SVG code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleResetPreview();
                          setBackgroundSource('custom');
                        }}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          backgroundSource === 'custom'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Custom color
                      </button>
                    </div>
                  </div>

                  <span className="text-[11px] text-neutral-400">
                    {backgroundSource === 'svg'
                      ? 'SVG as authored (uses SVG rects or leaves transparent)'
                      : 'Fills canvas before drawing SVG'}
                  </span>
                </div>

                {/* Custom Color Controls (greyed out & disabled when "From my SVG code" is selected) */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-4 pt-2.5 border-t border-neutral-800/80 transition-opacity ${
                    backgroundSource === 'svg' ? 'opacity-35 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-neutral-300">
                      Canvas fill:
                    </label>
                    {/* Preset Swatches */}
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: 'Slate', color: '#0f172a' },
                        { name: 'Red', color: '#ff0000' },
                        { name: 'Black', color: '#000000' },
                        { name: 'White', color: '#ffffff' },
                        { name: 'Navy', color: '#0b132b' },
                        { name: 'Violet', color: '#1e112a' }
                      ].map((swatch) => (
                        <button
                          key={swatch.color}
                          type="button"
                          disabled={backgroundSource === 'svg'}
                          onClick={() => {
                            handleResetPreview();
                            setBackgroundColor(swatch.color);
                            setIsTransparent(false);
                          }}
                          style={{ backgroundColor: swatch.color }}
                          title={swatch.name}
                          className={`w-6 h-6 rounded-md border transition cursor-pointer ${
                            backgroundColor === swatch.color && !isTransparent
                              ? 'ring-2 ring-indigo-500 border-white'
                              : 'border-neutral-700 hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Custom Hex Color Picker */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-800">
                      <input
                        type="color"
                        value={backgroundColor}
                        disabled={backgroundSource === 'svg' || isTransparent}
                        onChange={(e) => {
                          handleResetPreview();
                          setBackgroundColor(e.target.value);
                          setIsTransparent(false);
                        }}
                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent disabled:opacity-40"
                      />
                      <span className="text-xs font-mono text-neutral-400">
                        {isTransparent ? 'None' : backgroundColor}
                      </span>
                    </div>
                  </div>

                  {/* Transparent Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isTransparent}
                      disabled={backgroundSource === 'svg'}
                      onChange={(e) => {
                        handleResetPreview();
                        setIsTransparent(e.target.checked);
                      }}
                      className="accent-indigo-500 w-4 h-4 rounded disabled:opacity-40"
                    />
                    <span className="text-xs font-medium text-neutral-300">
                      Transparent Alpha
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      ({detectedFormat.isMp4Supported ? 'WebM recommended' : 'WebM'})
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Warning for high frame counts */}
            {isHighFrameCount && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  High frame count ({totalFrames} frames). At {fps} FPS and {duration}s duration,
                  pre-rendering and drift-free recording will take ~{(duration * 1.5).toFixed(0)} seconds.
                </span>
              </div>
            )}

            {/* Error Message */}
            {renderError && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center justify-between">
                <span>{renderError}</span>
                <button
                  onClick={() => setRenderError(null)}
                  className="text-red-400 hover:text-red-200"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TWO-PHASE Progress Section (during active render) */}
            {isRendering && renderProgress && (
              <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-800 flex flex-col gap-3 shadow-xl">
                {/* Two Phase Indicators */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`p-2 rounded-lg border flex items-center gap-2 transition ${
                      renderProgress.phase === 'preparing'
                        ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-200 font-medium'
                        : 'bg-neutral-950/40 border-neutral-800 text-emerald-400'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        renderProgress.phase === 'preparing'
                          ? 'bg-indigo-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span>1. Preparing frames</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex items-center gap-2 transition ${
                      renderProgress.phase === 'recording'
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-medium'
                        : 'bg-neutral-950/40 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        renderProgress.phase === 'recording'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-neutral-600'
                      }`}
                    />
                    <span>2. Recording video</span>
                  </div>
                </div>

                {/* Progress Details */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-200 font-semibold">
                      {renderProgress.phase === 'preparing'
                        ? `Preparing frame ${renderProgress.currentFrame} of ${renderProgress.totalFrames}...`
                        : `Recording frame ${renderProgress.currentFrame} of ${renderProgress.totalFrames}...`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-neutral-400">
                    <span>
                      {(renderProgress.elapsedMs / 1000).toFixed(1)}s elapsed
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-bold ${
                        renderProgress.phase === 'preparing'
                          ? 'text-indigo-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {renderProgress.percent}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ease-out ${
                      renderProgress.phase === 'preparing'
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                    style={{ width: `${renderProgress.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>
                    {renderProgress.phase === 'preparing'
                      ? 'Pre-rasterizing all SVG frames into memory ImageBitmaps'
                      : detectedFormat.hasWebCodecs
                      ? 'Frame-accurate WebCodecs encoding (VideoEncoder + mp4-muxer)'
                      : 'Drift-compensated stream capture via MediaRecorder (warm-up protected)'}
                  </span>
                  <button
                    onClick={handleCancelRender}
                    className="text-red-400 hover:text-red-300 font-medium transition cursor-pointer"
                  >
                    Cancel Render
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Button Bar */}
            <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                id="renderBtn"
                data-testid="render-btn"
                type="button"
                aria-label="Render Video"
                onClick={handleStartRender}
                disabled={!validation.valid || isRendering || !browserCheck.supported}
                className="w-full sm:flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
              >
                <Video className="w-4 h-4" />
                <span>
                  {isRendering ? 'Rendering Video...' : `Render Video (${totalFrames} frames)`}
                </span>
              </button>

              <button
                id="downloadBtn"
                data-testid="download-btn"
                type="button"
                aria-label="Download Video"
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
        </section>
      </main>

      {/* Help Modal Popup */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsHelpOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h2 id="help-modal-title" className="text-sm font-bold text-white tracking-wide uppercase">
                  Help & Documentation
                </h2>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300 leading-relaxed">
              {/* HOW TO MAKE A VIDEO */}
              <div>
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2.5">
                  HOW TO MAKE A VIDEO
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-200">
                  <li>Paste your SVG code in the editor (or load a sample).</li>
                  <li>Choose an Animation style below.</li>
                  <li>Choose a Background source.</li>
                  <li>Set Duration (1–30s), Resolution (720p/1080p), Frame Rate (24/30/60).</li>
                  <li>Click Render Video, then Download MP4/WebM — or Export Standalone HTML.</li>
                </ol>
              </div>

              {/* ANIMATIONS — WHAT EACH DOES */}
              <div>
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2.5">
                  ANIMATIONS — WHAT EACH DOES
                </h3>
                <ul className="space-y-2.5 text-neutral-200">
                  <li>
                    <span className="font-semibold text-white">Draw-on:</span> Strokes draw themselves like hand-drawing; fills fade in at the end. Best for line art and outlines.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Fade in:</span> The artwork gently fades in from transparent. Best for soft reveals.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Spin (continuous):</span> Rotates your artwork non-stop around its center. "Rotations" (1–10) = full turns per video. Background stays still. Best for loaders and spinners.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Pulse:</span> Soft blink — fully visible on the very first frame (great for file thumbnails), then gently pulses. "Pulses" (1–10) = pulses per video. Best for loading indicators.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Progress:</span> Loading-bar mode — the bar fills 0→100% with a live percentage counter. Your SVG needs id="progress-fill" on the fill rect and id="progress-text" on the % label. Best for progress/download bars.
                  </li>
                </ul>
              </div>

              {/* BACKGROUND SOURCE */}
              <div>
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2.5">
                  BACKGROUND SOURCE
                </h3>
                <ul className="space-y-1.5 text-neutral-200">
                  <li>
                    <span className="font-semibold text-white">From my SVG code (default):</span> the video background is exactly your SVG's background.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Custom color:</span> use any color (or transparent) instead.
                  </li>
                </ul>
              </div>

              {/* TIPS */}
              <div>
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2.5">
                  TIPS
                </h3>
                <ul className="space-y-1.5 text-neutral-200">
                  <li>
                    The video's first frame becomes its thumbnail in file managers — Pulse and Progress keep your loader visible from frame 0.
                  </li>
                  <li>
                    For green-screen (chroma key) videos, make your SVG background pure #00FF00 and keep "From my SVG code".
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for custom styling */}
      <style>{`
        .checkerboard {
          background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%),
                            linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #1e293b 75%),
                            linear-gradient(-45deg, transparent 75%, #1e293b 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
}
