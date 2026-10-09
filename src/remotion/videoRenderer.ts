import { RenderProgress, RenderResult, rasterizeSvgToBitmap } from '../utils/renderer';

// Dynamic import for mp4-muxer
let MuxerClass: any = null;
let ArrayBufferTargetClass: any = null;

async function loadMp4Muxer(): Promise<{ Muxer: any; ArrayBufferTarget: any } | null> {
  if (MuxerClass && ArrayBufferTargetClass) {
    return { Muxer: MuxerClass, ArrayBufferTarget: ArrayBufferTargetClass };
  }
  try {
    const mod = await import('mp4-muxer');
    MuxerClass = mod.Muxer;
    ArrayBufferTargetClass = mod.ArrayBufferTarget;
    return { Muxer: MuxerClass, ArrayBufferTarget: ArrayBufferTargetClass };
  } catch {
    try {
      const cdnUrl = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5/build/mp4-muxer.mjs';
      const importDynamic = new Function('url', 'return import(url)');
      const cdnMod = await importDynamic(cdnUrl);
      MuxerClass = cdnMod.Muxer;
      ArrayBufferTargetClass = cdnMod.ArrayBufferTarget;
      return { Muxer: MuxerClass, ArrayBufferTarget: ArrayBufferTargetClass };
    } catch {
      return null;
    }
  }
}

/**
 * Renders a sequence of SVG strings generated per frame to MP4/WebM
 * Reuses the exact same WebCodecs / MediaRecorder fallback pipeline
 */
export async function renderSvgFramesToVideo(options: {
  getFrameSvg: (frameIndex: number, totalFrames: number) => string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}): Promise<RenderResult> {
  const { getFrameSvg, duration, fps, width, height, onProgress, signal } = options;
  const totalFrames = Math.max(2, Math.round(duration * fps));

  // Phase 1: Pre-rasterize all frames into memory ImageBitmaps
  const frames: ImageBitmap[] = [];
  const startTime = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    if (signal?.aborted) {
      frames.forEach((f) => {
        try { f.close(); } catch {}
      });
      throw new DOMException('Rendering cancelled by user.', 'AbortError');
    }

    const svgStr = getFrameSvg(i, totalFrames);
    const bitmap = await rasterizeSvgToBitmap(
      svgStr,
      width,
      height,
      '#000000',
      false,
      'svg'
    );
    frames.push(bitmap);

    const elapsed = performance.now() - startTime;
    const avg = elapsed / (i + 1);
    const remaining = (totalFrames - (i + 1)) * avg;

    if (onProgress) {
      onProgress({
        phase: 'preparing',
        currentFrame: i + 1,
        totalFrames,
        percent: Math.min(100, Math.round(((i + 1) / totalFrames) * 100)),
        statusText: `Preparing frame ${i + 1} of ${totalFrames}...`,
        elapsedMs: elapsed,
        estimatedRemainingMs: remaining
      });
    }
  }

  try {
    const hasWebCodecs =
      typeof (window as any).VideoEncoder !== 'undefined' &&
      typeof (window as any).VideoFrame !== 'undefined';
    let muxerModule: { Muxer: any; ArrayBufferTarget: any } | null = null;

    if (hasWebCodecs) {
      muxerModule = await loadMp4Muxer();
    }

    if (hasWebCodecs && muxerModule) {
      // Primary Path: WebCodecs + mp4-muxer
      const safeWidth = width % 2 === 0 ? width : width - 1;
      const safeHeight = height % 2 === 0 ? height : height - 1;
      const target = new muxerModule.ArrayBufferTarget();
      const muxer = new muxerModule.Muxer({
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

      encoder.configure({
        codec: 'avc1.640028',
        width: safeWidth,
        height: safeHeight,
        bitrate: width >= 1920 ? 12_000_000 : 8_000_000,
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
            statusText: `Encoding frame ${i + 1} of ${totalFrames} (H.264)...`,
            elapsedMs: elapsed,
            estimatedRemainingMs: remaining
          });
        }
      }

      await encoder.flush();
      encoder.close();
      muxer.finalize();

      const buffer = target.buffer;
      const outputBlob = new Blob([buffer], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(outputBlob);
      const filename = `remotion-video-${duration}s-${width}x${height}.mp4`;

      return {
        blob: outputBlob,
        url: videoUrl,
        filename,
        mimeType: 'video/mp4',
        fileSizeBytes: outputBlob.size,
        durationSeconds: duration,
        width: safeWidth,
        height: safeHeight,
        fps,
        totalFrames,
        engineUsed: 'webcodecs'
      };
    }

    // MediaRecorder Fallback
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    if (!ctx) throw new Error('Failed to create canvas context for MediaRecorder fallback');

    ctx.drawImage(frames[0], 0, 0);
    const stream = canvas.captureStream(fps);
    const track = stream.getVideoTracks()[0];
    const bitRate = width >= 1920 ? 12_000_000 : 8_000_000;
    const recorder = new MediaRecorder(stream, { videoBitsPerSecond: bitRate });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return await new Promise<RenderResult>((resolve, reject) => {
      let isStopped = false;
      const cleanup = () => {
        isStopped = true;
        stream.getTracks().forEach((t) => t.stop());
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          cleanup();
          try {
            if (recorder.state !== 'inactive') recorder.stop();
          } catch {}
          reject(new DOMException('Rendering cancelled by user.', 'AbortError'));
        });
      }

      recorder.onstop = () => {
        cleanup();
        const outputBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(outputBlob);
        const ext = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
        resolve({
          blob: outputBlob,
          url: videoUrl,
          filename: `remotion-video-${duration}s-${width}x${height}.${ext}`,
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
        reject(new Error('MediaRecorder error: ' + (err as any).message));
      };

      recorder.start(100);

      (async () => {
        try {
          await new Promise<void>((res) => setTimeout(res, 150));
          const recordingStart = performance.now();
          const frameInterval = 1000 / fps;
          let next = performance.now();

          for (let f = 0; f < totalFrames; f++) {
            if (isStopped || signal?.aborted) break;
            ctx.drawImage(frames[f], 0, 0);
            if (track && 'requestFrame' in track) {
              (track as any).requestFrame();
            }

            const elapsed = performance.now() - recordingStart;
            const avg = elapsed / (f + 1);
            const remaining = (totalFrames - (f + 1)) * avg;

            if (onProgress) {
              onProgress({
                phase: 'recording',
                currentFrame: f + 1,
                totalFrames,
                percent: Math.min(100, Math.round(((f + 1) / totalFrames) * 100)),
                statusText: `Recording frame ${f + 1} of ${totalFrames}...`,
                elapsedMs: elapsed,
                estimatedRemainingMs: remaining
              });
            }

            next += frameInterval;
            const delay = Math.max(0, next - performance.now());
            await new Promise((r) => setTimeout(r, delay));
          }

          await new Promise((r) => setTimeout(r, 100));
          if (recorder.state !== 'inactive') recorder.stop();
        } catch (e) {
          cleanup();
          reject(e);
        }
      })();
    });
  } finally {
    frames.forEach((f) => {
      try { f.close(); } catch {}
    });
  }
}
