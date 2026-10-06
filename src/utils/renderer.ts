/**
 * Frame-Accurate WebCodecs + Muxer Video Renderer with MediaRecorder Fallback
 */

import {
  AnimationStyle,
  measureSvgGeometries,
  renderAnimatedSvgString
} from './animator';

// Try importing mp4-muxer
let MuxerClass: any = null;
let ArrayBufferTargetClass: any = null;

async function loadMp4Muxer(): Promise<{ Muxer: any; ArrayBufferTarget: any } | null> {
  if (MuxerClass && ArrayBufferTargetClass) {
    return { Muxer: MuxerClass, ArrayBufferTarget: ArrayBufferTargetClass };
  }

  // 1. Try local npm import (bundled by Vite)
  try {
    const mod = await import('mp4-muxer');
    MuxerClass = mod.Muxer;
    ArrayBufferTargetClass = mod.ArrayBufferTarget;
    return { Muxer: MuxerClass, ArrayBufferTarget: ArrayBufferTargetClass };
  } catch (localErr) {
    console.warn('Local mp4-muxer import failed, trying CDN fallback...', localErr);
  }

  // 2. Try ESM CDN import fallback
  try {
    const cdnUrl = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5/build/mp4-muxer.mjs';
    const importDynamic = new Function('url', 'return import(url)');
    const cdnMod = await importDynamic(cdnUrl);
    MuxerClass = cdnMod.Muxer;
    ArrayBufferTargetClass = cdnMod.ArrayBufferTarget;
    return { Muxer: MuxerClass, ArrayBufferTarget: ArrayBufferTargetClass };
  } catch (cdnErr) {
    console.warn('CDN mp4-muxer import failed, will use MediaRecorder fallback:', cdnErr);
    return null;
  }
}

export interface RenderResolution {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const RESOLUTIONS: RenderResolution[] = [
  { id: '1080p', label: '1080p FHD (1920 × 1080)', width: 1920, height: 1080, aspectRatio: '16:9' },
  { id: '720p', label: '720p HD (1280 × 720)', width: 1280, height: 720, aspectRatio: '16:9' },
  { id: 'square', label: '1:1 Square (1080 × 1080)', width: 1080, height: 1080, aspectRatio: '1:1' },
  { id: 'vertical', label: '9:16 Vertical (1080 × 1920)', width: 1080, height: 1920, aspectRatio: '9:16' }
];

export type RenderPhase = 'preparing' | 'recording';

export type BackgroundSource = 'svg' | 'custom';

export interface RenderProgress {
  phase: RenderPhase;
  currentFrame: number;
  totalFrames: number;
  percent: number;
  statusText: string;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface RenderResult {
  blob: Blob;
  url: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  engineUsed: 'webcodecs' | 'mediarecorder';
}

export interface SupportedFormatInfo {
  mimeType: string;
  extension: 'mp4' | 'webm';
  label: string;
  isMp4Supported: boolean;
  isWebmSupported: boolean;
  hasWebCodecs: boolean;
}

/**
 * Checks browser capabilities for video recording
 */
export function checkBrowserCapabilities(): {
  supported: boolean;
  reason?: string;
  hasWebCodecs: boolean;
} {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Window object not available.', hasWebCodecs: false };
  }

  const hasWebCodecs = typeof (window as any).VideoEncoder !== 'undefined' && typeof (window as any).VideoFrame !== 'undefined';
  const hasMediaRecorder = 'MediaRecorder' in window;
  const hasCaptureStream = typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;

  if (hasWebCodecs) {
    return { supported: true, hasWebCodecs: true };
  }

  if (!hasMediaRecorder) {
    return {
      supported: false,
      reason: 'Your browser does not support WebCodecs or MediaRecorder. Please use Chrome, Edge, or Firefox.',
      hasWebCodecs: false
    };
  }

  if (!hasCaptureStream) {
    return {
      supported: false,
      reason: 'Your browser does not support canvas.captureStream(). Please use Chrome or Firefox.',
      hasWebCodecs: false
    };
  }

  return { supported: true, hasWebCodecs: false };
}

/**
 * Probes best supported video format
 */
export function getBestSupportedVideoMimeType(): SupportedFormatInfo {
  const hasWebCodecs = typeof window !== 'undefined' && typeof (window as any).VideoEncoder !== 'undefined';

  if (hasWebCodecs) {
    return {
      mimeType: 'video/mp4;codecs=avc1.640028',
      extension: 'mp4',
      label: 'MP4 (WebCodecs H.264)',
      isMp4Supported: true,
      isWebmSupported: true,
      hasWebCodecs: true
    };
  }

  if (typeof window === 'undefined' || !('MediaRecorder' in window)) {
    return {
      mimeType: '',
      extension: 'webm',
      label: 'Unavailable',
      isMp4Supported: false,
      isWebmSupported: false,
      hasWebCodecs: false
    };
  }

  const mp4Types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4'
  ];

  let isMp4Supported = false;
  let bestMp4 = '';
  for (const t of mp4Types) {
    if (MediaRecorder.isTypeSupported(t)) {
      isMp4Supported = true;
      bestMp4 = t;
      break;
    }
  }

  if (isMp4Supported) {
    return {
      mimeType: bestMp4,
      extension: 'mp4',
      label: 'MP4 (H.264)',
      isMp4Supported: true,
      isWebmSupported: true,
      hasWebCodecs: false
    };
  }

  return {
    mimeType: 'video/webm',
    extension: 'webm',
    label: 'WebM (VP9/VP8)',
    isMp4Supported: false,
    isWebmSupported: true,
    hasWebCodecs: false
  };
}

/**
 * Rasterizes a single SVG string into an ImageBitmap offscreen
 */
export async function rasterizeSvgToBitmap(
  svgString: string,
  width: number,
  height: number,
  backgroundColor: string,
  isTransparent: boolean,
  backgroundSource: BackgroundSource = 'svg'
): Promise<ImageBitmap> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.src = url;

  try {
    if (typeof img.decode === 'function') {
      await img.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        (img as HTMLImageElement).onload = () => resolve();
        (img as HTMLImageElement).onerror = (e: any) => reject(new Error('Failed to load SVG frame image: ' + e));
      });
    }
  } finally {
    URL.revokeObjectURL(url);
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  }

  const isAlphaNeeded = backgroundSource === 'svg' || isTransparent;

  const ctx = canvas.getContext('2d', {
    alpha: isAlphaNeeded,
    willReadFrequently: false
  }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  if (!ctx) {
    throw new Error('Could not get 2D canvas context for frame rasterization.');
  }

  // Draw background:
  // "From my SVG code" (default): do NOT pre-fill canvas with any color.
  // Each rendered frame shows exactly the SVG as authored.
  if (backgroundSource === 'svg' || isTransparent) {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Intrinsic dimensions of the SVG image
  const naturalWidth = img.naturalWidth || width;
  const naturalHeight = img.naturalHeight || height;

  // Fit with cover semantics (zero margins, edge-to-edge fill)
  const scale = Math.max(width / naturalWidth, height / naturalHeight);
  const drawW = naturalWidth * scale;
  const drawH = naturalHeight * scale;
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  return await createImageBitmap(canvas);
}

/**
 * Pre-renders all frames for a video into an array of ImageBitmap objects
 */
export async function preRenderAllFrames(options: {
  svgCode: string;
  animationStyle: AnimationStyle;
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  isTransparent: boolean;
  backgroundSource?: BackgroundSource;
  spinCount?: number;
  pulseCount?: number;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}): Promise<ImageBitmap[]> {
  const {
    svgCode,
    animationStyle,
    duration,
    fps,
    width,
    height,
    backgroundColor,
    isTransparent,
    backgroundSource = 'svg',
    spinCount,
    pulseCount,
    onProgress,
    signal
  } = options;

  const { measurements, sanitizedSvg } = measureSvgGeometries(svgCode);
  const totalFrames = Math.max(2, Math.round(duration * fps));
  const frames: ImageBitmap[] = [];
  const startTime = performance.now();

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (signal?.aborted) {
      frames.forEach((f) => {
        try { f.close(); } catch {}
      });
      throw new DOMException('Rendering cancelled by user.', 'AbortError');
    }

    const t = totalFrames <= 1 ? 1 : frameIndex / (totalFrames - 1);
    const frameSvg = renderAnimatedSvgString(
      sanitizedSvg,
      animationStyle,
      t,
      duration,
      measurements,
      spinCount,
      pulseCount
    );

    const bitmap = await rasterizeSvgToBitmap(
      frameSvg,
      width,
      height,
      backgroundColor,
      isTransparent,
      backgroundSource
    );
    frames.push(bitmap);

    const elapsed = performance.now() - startTime;
    const avgPerFrame = elapsed / (frameIndex + 1);
    const remaining = (totalFrames - (frameIndex + 1)) * avgPerFrame;

    if (onProgress) {
      onProgress({
        phase: 'preparing',
        currentFrame: frameIndex + 1,
        totalFrames,
        percent: Math.min(100, Math.round(((frameIndex + 1) / totalFrames) * 100)),
        statusText: `Preparing frame ${frameIndex + 1} of ${totalFrames}...`,
        elapsedMs: elapsed,
        estimatedRemainingMs: remaining
      });
    }
  }

  return frames;
}

/**
 * Phase 2 with WebCodecs: Frame-accurate encoding via VideoEncoder + mp4-muxer
 */
async function renderWithWebCodecs(options: {
  frames: ImageBitmap[];
  width: number;
  height: number;
  fps: number;
  duration: number;
  muxerModule: { Muxer: any; ArrayBufferTarget: any };
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}): Promise<RenderResult> {
  const { frames, width, height, fps, duration, muxerModule, onProgress, signal } = options;
  const { Muxer, ArrayBufferTarget } = muxerModule;

  // Ensure even dimensions for H.264
  const safeWidth = width % 2 === 0 ? width : width - 1;
  const safeHeight = height % 2 === 0 ? height : height - 1;
  const totalFrames = frames.length;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: safeWidth,
      height: safeHeight
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset'
  });

  let encoderError: Error | null = null;
  const encoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e: any) => {
      console.error('VideoEncoder error:', e);
      encoderError = e instanceof Error ? e : new Error(String(e));
    }
  });

  const codecString = 'avc1.640028';
  encoder.configure({
    codec: codecString,
    width: safeWidth,
    height: safeHeight,
    bitrate: 8_000_000,
    framerate: fps
  });

  const phase2Start = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    if (signal?.aborted) {
      encoder.close();
      throw new DOMException('Rendering cancelled by user.', 'AbortError');
    }
    if (encoderError) {
      throw encoderError;
    }

    const bitmap = frames[i];
    const timestampUs = Math.round((i * 1_000_000) / fps);
    const durationUs = Math.round(1_000_000 / fps);

    const vf = new (window as any).VideoFrame(bitmap, {
      timestamp: timestampUs,
      duration: durationUs
    });

    const isKeyframe = i % (fps * 2) === 0;
    encoder.encode(vf, { keyFrame: isKeyframe });
    vf.close();

    const elapsed = performance.now() - phase2Start;
    const avg = elapsed / (i + 1);
    const remaining = (totalFrames - (i + 1)) * avg;

    if (onProgress) {
      onProgress({
        phase: 'recording',
        currentFrame: i + 1,
        totalFrames,
        percent: Math.min(100, Math.round(((i + 1) / totalFrames) * 100)),
        statusText: `Encoding frame ${i + 1} of ${totalFrames} (WebCodecs)...`,
        elapsedMs: elapsed,
        estimatedRemainingMs: remaining
      });
    }

    // Keep encode queue from growing excessively
    if (encoder.encodeQueueSize > 5) {
      await new Promise<void>((resolve) => {
        const checkQueue = () => {
          if (encoder.encodeQueueSize <= 2) resolve();
          else setTimeout(checkQueue, 4);
        };
        checkQueue();
      });
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const buffer = target.buffer;
  const outputBlob = new Blob([buffer], { type: 'video/mp4' });
  const videoUrl = URL.createObjectURL(outputBlob);
  const filename = `svg-video-${duration}s-${width}x${height}.mp4`;

  return {
    blob: outputBlob,
    url: videoUrl,
    filename,
    mimeType: 'video/mp4',
    fileSizeBytes: outputBlob.size,
    durationSeconds: duration,
    width,
    height,
    fps,
    totalFrames,
    engineUsed: 'webcodecs'
  };
}

/**
 * Phase 2 fallback with MediaRecorder: Fixes encoder warm-up race by waiting for first ondataavailable
 */
async function renderWithMediaRecorder(options: {
  frames: ImageBitmap[];
  width: number;
  height: number;
  fps: number;
  duration: number;
  isTransparent: boolean;
  backgroundSource?: BackgroundSource;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}): Promise<RenderResult> {
  const {
    frames,
    width,
    height,
    fps,
    duration,
    isTransparent,
    backgroundSource = 'svg',
    onProgress,
    signal
  } = options;
  const totalFrames = frames.length;
  const frameIntervalMs = 1000 / fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const isAlphaNeeded = backgroundSource === 'svg' || isTransparent;

  const ctx = canvas.getContext('2d', {
    alpha: isAlphaNeeded,
    willReadFrequently: false
  });

  if (!ctx) {
    throw new Error('Could not create canvas 2D rendering context.');
  }

  // Draw frame 0 statically so encoder warms up without losing motion frames
  if (isAlphaNeeded) {
    ctx.clearRect(0, 0, width, height);
  }
  ctx.drawImage(frames[0], 0, 0);

  const stream = canvas.captureStream(fps);
  const track = stream.getVideoTracks()[0];

  const formatInfo = getBestSupportedVideoMimeType();
  const bitRate = width >= 1920 ? 12_000_000 : 8_000_000;

  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: bitRate
  };
  if (formatInfo.mimeType) {
    recorderOptions.mimeType = formatInfo.mimeType;
  }

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, recorderOptions);
  } catch {
    recorder = new MediaRecorder(stream);
  }

  const recordedChunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  return new Promise<RenderResult>((resolve, reject) => {
    let isStopped = false;

    const cleanup = () => {
      isStopped = true;
      stream.getTracks().forEach((t) => t.stop());
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        try {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        } catch {}
        reject(new DOMException('Rendering cancelled by user.', 'AbortError'));
      });
    }

    recorder.onstop = () => {
      cleanup();
      const outputBlob = new Blob(recordedChunks, {
        type: recorder.mimeType || formatInfo.mimeType || 'video/webm'
      });
      const videoUrl = URL.createObjectURL(outputBlob);
      const ext = formatInfo.extension;
      const filename = `svg-video-${duration}s-${width}x${height}.${ext}`;

      resolve({
        blob: outputBlob,
        url: videoUrl,
        filename,
        mimeType: outputBlob.type || 'video/webm',
        fileSizeBytes: outputBlob.size,
        durationSeconds: duration,
        width,
        height,
        fps,
        totalFrames,
        engineUsed: 'mediarecorder'
      });
    };

    recorder.onerror = (err) => {
      cleanup();
      reject(new Error('MediaRecorder error: ' + ((err as any).error?.message || 'Recording failed')));
    };

    // Warm-up fix: Start recorder with 100ms timeslice and WAIT for first dataavailable
    // keeping frame 0 drawn statically before driving playback
    recorder.start(100);

    (async () => {
      try {
        await new Promise<void>((res) => {
          let resolved = false;
          const onData = (e: BlobEvent) => {
            if (!resolved && e.data && e.data.size > 0) {
              resolved = true;
              recorder.removeEventListener('dataavailable', onData);
              res();
            }
          };
          recorder.addEventListener('dataavailable', onData);
          // Safety timeout after 450ms max
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              recorder.removeEventListener('dataavailable', onData);
              res();
            }
          }, 450);
        });

        // Now that the encoder is confirmed active and producing chunks, play all frames drift-compensated
        const recordingStartTime = performance.now();
        let next = performance.now();

        for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
          if (isStopped || (signal && signal.aborted)) {
            break;
          }

          if (isAlphaNeeded) {
            ctx.clearRect(0, 0, width, height);
          }
          ctx.drawImage(frames[frameIndex], 0, 0);

          if (track && 'requestFrame' in track) {
            (track as any).requestFrame();
          }

          const elapsed = performance.now() - recordingStartTime;
          const avg = elapsed / (frameIndex + 1);
          const remaining = (totalFrames - (frameIndex + 1)) * avg;

          if (onProgress) {
            onProgress({
              phase: 'recording',
              currentFrame: frameIndex + 1,
              totalFrames,
              percent: Math.min(100, Math.round(((frameIndex + 1) / totalFrames) * 100)),
              statusText: `Recording frame ${frameIndex + 1} of ${totalFrames}...`,
              elapsedMs: elapsed,
              estimatedRemainingMs: remaining
            });
          }

          next += frameIntervalMs;
          const delay = Math.max(0, next - performance.now());
          await new Promise((r) => setTimeout(r, delay));
        }

        await new Promise((r) => setTimeout(r, Math.max(80, frameIntervalMs * 1.5)));

        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  });
}

/**
 * Deterministic frame-accurate video renderer:
 * Phase 1: Pre-render all frames to ImageBitmap
 * Phase 2: Frame-accurate WebCodecs + Muxer (or warm-up-protected MediaRecorder fallback)
 */
export async function renderSvgToVideo(options: {
  svgCode: string;
  animationStyle: AnimationStyle;
  duration: number; // in seconds
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  isTransparent: boolean;
  backgroundSource?: BackgroundSource;
  spinCount?: number;
  pulseCount?: number;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}): Promise<RenderResult> {
  const {
    svgCode,
    animationStyle,
    duration,
    fps,
    width,
    height,
    backgroundColor,
    isTransparent,
    backgroundSource = 'svg',
    spinCount,
    pulseCount,
    onProgress,
    signal
  } = options;

  const browserCheck = checkBrowserCapabilities();
  if (!browserCheck.supported) {
    throw new Error(browserCheck.reason || 'Browser does not support video rendering');
  }

  // PHASE 1: Pre-render all frames offscreen into memory
  const frames = await preRenderAllFrames({
    svgCode,
    animationStyle,
    duration,
    fps,
    width,
    height,
    backgroundColor,
    isTransparent,
    backgroundSource,
    spinCount,
    pulseCount,
    onProgress,
    signal
  });

  try {
    // PHASE 2: Check if WebCodecs is available
    const hasWebCodecs = typeof (window as any).VideoEncoder !== 'undefined' && typeof (window as any).VideoFrame !== 'undefined';
    let muxerModule: { Muxer: any; ArrayBufferTarget: any } | null = null;

    if (hasWebCodecs) {
      muxerModule = await loadMp4Muxer();
    }

    if (hasWebCodecs && muxerModule) {
      // Primary Path: Frame-accurate WebCodecs pipeline
      return await renderWithWebCodecs({
        frames,
        width,
        height,
        fps,
        duration,
        muxerModule,
        onProgress,
        signal
      });
    }

    // Fallback Path: MediaRecorder with warm-up race fix
    return await renderWithMediaRecorder({
      frames,
      width,
      height,
      fps,
      duration,
      isTransparent,
      backgroundSource,
      onProgress,
      signal
    });
  } finally {
    // Clean up memory ImageBitmaps
    frames.forEach((f) => {
      try { f.close(); } catch {}
    });
  }
}
