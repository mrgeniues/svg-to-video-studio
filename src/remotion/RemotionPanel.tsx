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
  XCircle
} from 'lucide-react';
import { REMOTION_TEMPLATES, RemotionTemplate } from './templates';
import { renderSvgFramesToVideo } from './videoRenderer';
import {
  RESOLUTIONS,
  RenderResolution,
  RenderProgress,
  RenderResult,
  checkBrowserCapabilities
} from '../utils/renderer';

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
  const selectedTemplate = useMemo(
    () => REMOTION_TEMPLATES.find((t) => t.id === selectedTemplateId) || REMOTION_TEMPLATES[0],
    [selectedTemplateId]
  );

  // Custom Controls State
  const [title, setTitle] = useState<string>(selectedTemplate.defaultTitle);
  const [accent, setAccent] = useState<string>(selectedTemplate.defaultAccent);

  // When template changes, update default title & accent
  const handleSelectTemplate = (tpl: RemotionTemplate) => {
    setSelectedTemplateId(tpl.id);
    setTitle(tpl.defaultTitle);
    setAccent(tpl.defaultAccent);
    setPreviewTime(0);
    setIsPlaying(false);
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

  // Compute current frame SVG
  const currentFrameSvg = useMemo(() => {
    return selectedTemplate.renderFrame(
      previewTime,
      duration,
      selectedResolution.width,
      selectedResolution.height,
      { title, accent }
    );
  }, [selectedTemplate, previewTime, duration, selectedResolution, title, accent]);

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
    const width = selectedResolution.width;
    const height = selectedResolution.height;

    try {
      const result = await renderSvgFramesToVideo({
        getFrameSvg: (frameIdx, totalF) => {
          const t = totalF <= 1 ? 0 : (frameIdx / (totalF - 1)) * duration;
          return tpl.renderFrame(t, duration, width, height, {
            title: currentTitle,
            accent: currentAccent
          });
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
                Select Remotion Template ({REMOTION_TEMPLATES.length} Available)
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
                Frame {Math.round((previewTime / duration) * (totalFrames - 1))} of {totalFrames}
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
    </div>
  );
};
