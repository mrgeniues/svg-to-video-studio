/**
 * Animation and SVG Processing Utilities for SVG to Video Studio
 */

export type AnimationStyle =
  | 'draw-on'
  | 'pulse'
  | 'progress'
  | 'fade-in'
  | 'zoom-in'
  | 'rotate-in'
  | 'slide-up'
  | 'pulse-loop'
  | 'spin-continuous'
  | 'stagger-pulse'
  | 'slide-block'
  | 'progress-follow';

export interface SvgValidationResult {
  valid: boolean;
  error?: string;
  viewBox?: { x: number; y: number; width: number; height: number };
  width?: number;
  height?: number;
  elementCount?: number;
  hasStrokes?: boolean;
}

export interface GeometryMeasurement {
  id: string;
  length: number;
  hasFill: boolean;
  hasExplicitStroke: boolean;
}

// Cubic easing helpers
export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Validates SVG XML code and extracts metadata
 */
export function validateSvg(svgString: string): SvgValidationResult {
  if (!svgString || !svgString.trim()) {
    return { valid: false, error: 'SVG code cannot be empty.' };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');

  if (parserError) {
    const rawError = parserError.textContent || 'Syntax error in SVG XML';
    // Clean up XML serializer error text to make it user-friendly
    const cleanError = rawError.split('\n')[0].replace(/^error on line \d+ at column \d+: /, '');
    return { valid: false, error: cleanError };
  }

  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') {
    return { valid: false, error: 'Root element must be an <svg> tag.' };
  }

  // Parse viewBox
  let viewBox: { x: number; y: number; width: number; height: number } | undefined;
  const vbAttr = root.getAttribute('viewBox');
  if (vbAttr) {
    const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }

  // Parse width & height
  const widthAttr = parseFloat(root.getAttribute('width') || '');
  const heightAttr = parseFloat(root.getAttribute('height') || '');
  const width = !isNaN(widthAttr) ? widthAttr : viewBox ? viewBox.width : 500;
  const height = !isNaN(heightAttr) ? heightAttr : viewBox ? viewBox.height : 500;

  if (!viewBox) {
    viewBox = { x: 0, y: 0, width, height };
  }

  const allElements = root.querySelectorAll('*');
  let hasStrokes = false;
  root.querySelectorAll('path, line, polyline, polygon, circle, rect, ellipse').forEach(el => {
    const stroke = el.getAttribute('stroke') || (el as HTMLElement).style.stroke;
    if (stroke && stroke !== 'none') {
      hasStrokes = true;
    }
  });

  return {
    valid: true,
    viewBox,
    width,
    height,
    elementCount: allElements.length,
    hasStrokes
  };
}

/**
 * Sanitizes SVG code to prevent tainted canvas issues and remove dangerous script tags
 */
export function sanitizeSvg(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;

  // Remove all <script> tags
  root.querySelectorAll('script').forEach(el => el.remove());

  // Remove external http/https image tags that could taint canvas
  root.querySelectorAll('image').forEach(img => {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href');
    if (href && !href.startsWith('data:image/')) {
      img.remove();
    }
  });

  // Ensure xmlns is present
  if (!root.getAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  return new XMLSerializer().serializeToString(doc);
}

/**
 * Pre-measures geometry lengths for Draw-on animation
 */
export function measureSvgGeometries(svgString: string): {
  measurements: GeometryMeasurement[];
  sanitizedSvg: string;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;

  // Remove scripts
  root.querySelectorAll('script').forEach(el => el.remove());

  // Ensure hidden sandbox container exists in DOM for accurate length measurement
  let sandbox = document.getElementById('svg-measure-sandbox') as HTMLDivElement | null;
  if (!sandbox) {
    sandbox = document.createElement('div');
    sandbox.id = 'svg-measure-sandbox';
    sandbox.style.position = 'fixed';
    sandbox.style.left = '-9999px';
    sandbox.style.top = '-9999px';
    sandbox.style.width = '0';
    sandbox.style.height = '0';
    sandbox.style.opacity = '0';
    sandbox.style.pointerEvents = 'none';
    sandbox.style.overflow = 'hidden';
    document.body.appendChild(sandbox);
  }

  // Clone into sandbox
  const importedSvg = document.importNode(root, true);
  sandbox.innerHTML = '';
  sandbox.appendChild(importedSvg);

  const geometryElements = importedSvg.querySelectorAll(
    'path, line, polyline, polygon, circle, rect, ellipse'
  );

  const measurements: GeometryMeasurement[] = [];

  geometryElements.forEach((el, index) => {
    const id = `anim-geom-${index}`;
    el.setAttribute('data-geom-id', id);

    let length = 300;
    try {
      if (typeof (el as SVGGeometryElement).getTotalLength === 'function') {
        const measured = (el as SVGGeometryElement).getTotalLength();
        if (measured > 0) {
          length = measured;
        }
      }
    } catch {
      // Fallback calculations if browser fails to measure offscreen geometry
      const tag = el.nodeName.toLowerCase();
      if (tag === 'circle') {
        const r = parseFloat(el.getAttribute('r') || '0');
        length = 2 * Math.PI * (r || 50);
      } else if (tag === 'rect') {
        const w = parseFloat(el.getAttribute('width') || '0');
        const h = parseFloat(el.getAttribute('height') || '0');
        length = 2 * (w + h);
      } else if (tag === 'ellipse') {
        const rx = parseFloat(el.getAttribute('rx') || '0');
        const ry = parseFloat(el.getAttribute('ry') || '0');
        length = Math.PI * (rx + ry);
      } else if (tag === 'line') {
        const x1 = parseFloat(el.getAttribute('x1') || '0');
        const y1 = parseFloat(el.getAttribute('y1') || '0');
        const x2 = parseFloat(el.getAttribute('x2') || '0');
        const y2 = parseFloat(el.getAttribute('y2') || '0');
        length = Math.hypot(x2 - x1, y2 - y1);
      }
    }

    const fillAttr = el.getAttribute('fill') || (el as HTMLElement).style.fill;
    const strokeAttr = el.getAttribute('stroke') || (el as HTMLElement).style.stroke;
    const hasFill = Boolean(fillAttr && fillAttr !== 'none');
    const hasExplicitStroke = Boolean(strokeAttr && strokeAttr !== 'none');

    measurements.push({
      id,
      length: Math.max(1, length),
      hasFill,
      hasExplicitStroke
    });
  });

  // Also tag original doc
  const originalGeoms = root.querySelectorAll(
    'path, line, polyline, polygon, circle, rect, ellipse'
  );
  originalGeoms.forEach((el, index) => {
    el.setAttribute('data-geom-id', `anim-geom-${index}`);
  });

  // Record original width of #progress-fill if present
  const progressFillEl = root.querySelector('#progress-fill');
  if (progressFillEl) {
    const rawW = progressFillEl.getAttribute('width');
    if (rawW) {
      progressFillEl.setAttribute('data-original-width', rawW);
    }
  }

  // Clean sandbox
  sandbox.innerHTML = '';

  return {
    measurements,
    sanitizedSvg: new XMLSerializer().serializeToString(doc)
  };
}

/**
 * Detects if an SVG element is a full-frame background rectangle
 */
export function isBackgroundElement(el: Element, vbW: number, vbH: number): boolean {
  if (el.nodeName.toLowerCase() !== 'rect') return false;

  // If it has an explicit visible stroke, it's not a pure backdrop
  const stroke = el.getAttribute('stroke') || (el as HTMLElement).style?.stroke;
  if (stroke && stroke !== 'none') return false;

  const wAttr = el.getAttribute('width') || '';
  const hAttr = el.getAttribute('height') || '';
  const x = parseFloat(el.getAttribute('x') || '0') || 0;
  const y = parseFloat(el.getAttribute('y') || '0') || 0;

  const isFullW = wAttr.includes('%') || parseFloat(wAttr) >= vbW * 0.95;
  const isFullH = hAttr.includes('%') || parseFloat(hAttr) >= vbH * 0.95;
  const isNearOrigin = Math.abs(x) <= vbW * 0.05 && Math.abs(y) <= vbH * 0.05;

  return isFullW && isFullH && isNearOrigin;
}

/**
 * Checks if an element is contained within a <defs> block
 */
export function isInsideDefs(el: Element): boolean {
  let curr: Element | null = el;
  while (curr) {
    if (curr.nodeName.toLowerCase() === 'defs') return true;
    curr = curr.parentElement;
  }
  return false;
}

/**
 * Applies programmatic animation at normalized progress t (0.0 to 1.0)
 * Returns a serialized SVG string ready for rendering
 */
export function renderAnimatedSvgString(
  baseSvgString: string,
  style: AnimationStyle,
  t: number,
  duration: number,
  measurements?: GeometryMeasurement[],
  spinCount?: number,
  pulseCount?: number
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(baseSvgString, 'image/svg+xml');
  const root = doc.documentElement;

  // ViewBox coordinates for center transforms
  let vbX = 0;
  let vbY = 0;
  let vbW = 500;
  let vbH = 500;

  const vbAttr = root.getAttribute('viewBox');
  if (vbAttr) {
    const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      vbX = parts[0];
      vbY = parts[1];
      vbW = parts[2];
      vbH = parts[3];
    }
  } else {
    vbW = parseFloat(root.getAttribute('width') || '500') || 500;
    vbH = parseFloat(root.getAttribute('height') || '500') || 500;
    root.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  }

  // Ensure width & height are explicit pixel dimensions from viewBox/attributes, never percentages
  const widthAttr = root.getAttribute('width');
  const heightAttr = root.getAttribute('height');
  if (!widthAttr || widthAttr.includes('%')) {
    root.setAttribute('width', String(vbW));
  }
  if (!heightAttr || heightAttr.includes('%')) {
    root.setAttribute('height', String(vbH));
  }

  // Prevent responsive CSS styles from leaking into serialized SVG markup
  if (root.hasAttribute('style')) {
    (root as HTMLElement).style.removeProperty('width');
    (root as HTMLElement).style.removeProperty('height');
    (root as HTMLElement).style.removeProperty('max-width');
    (root as HTMLElement).style.removeProperty('max-height');
  }

  const cx = vbX + vbW / 2;
  const cy = vbY + vbH / 2;

  // Clamp t
  const progress = Math.max(0, Math.min(1, t));

  switch (style) {
    case 'draw-on': {
      // Stroke draw-on animation:
      // Each stroke dashes out from 0% to 100% of length
      // Fill gently fades in during the latter half of animation
      const geomMap = new Map<string, GeometryMeasurement>();
      if (measurements) {
        measurements.forEach(m => geomMap.set(m.id, m));
      }

      const elements = root.querySelectorAll('[data-geom-id]');
      elements.forEach(el => {
        // Full-frame background rect MUST NEVER be hidden, dashed, or faded out!
        if (isBackgroundElement(el, vbW, vbH)) {
          (el as HTMLElement).style.fillOpacity = '1';
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.removeProperty('stroke-dasharray');
          (el as HTMLElement).style.removeProperty('stroke-dashoffset');
          return;
        }

        const id = el.getAttribute('data-geom-id') || '';
        const m = geomMap.get(id);
        const len = m ? m.length : 350;

        const strokeProg = Math.min(1, progress * 1.05);
        (el as HTMLElement).style.strokeDasharray = `${len} ${len}`;
        (el as HTMLElement).style.strokeDashoffset = `${(1 - strokeProg) * len}`;

        // If shape has fill, fade fill in during the second half
        if (m && m.hasFill) {
          if (progress < 0.45) {
            (el as HTMLElement).style.fillOpacity = '0';
          } else {
            const fillProg = (progress - 0.45) / 0.55;
            (el as HTMLElement).style.fillOpacity = `${Math.min(1, easeOutCubic(fillProg))}`;
          }
        }
      });
      break;
    }

    case 'pulse': {
      // Deterministic continuous opacity pulse:
      // opacity(t) = 0.55 + 0.45 * cos(2 * PI * pulses * t / duration)
      // At t=0 opacity is EXACTLY 1 (fully visible first frame)
      const count = typeof pulseCount === 'number' && pulseCount > 0 ? pulseCount : 4;
      const opacity = 0.55 + 0.45 * Math.cos(2 * Math.PI * count * progress);
      wrapChildrenInGroup(doc, root, '', `opacity: ${opacity};`, vbW, vbH);
      break;
    }

    case 'stagger-pulse': {
      // Deterministic staggered opacity pulse across foreground shapes:
      // Each foreground shape (path, line, polyline, polygon, circle, rect, ellipse, text
      // in document order, skipping anything inside <defs> and skipping the full-frame background rect)
      // receives opacity = 0.55 + 0.45 * cos(2 * PI * pulses * t - phase_i)
      // where phase_i = (i / N) * 2 * PI
      // At t=0, phase_0 = 0 => opacity = 0.55 + 0.45 * 1.0 = 1.0 (first shape fully visible)
      const count = typeof pulseCount === 'number' && pulseCount > 0 ? pulseCount : 4;
      const allShapes = root.querySelectorAll('path, line, polyline, polygon, circle, rect, ellipse, text');
      const foregroundShapes: Element[] = [];
      allShapes.forEach(el => {
        if (isInsideDefs(el)) return;
        if (isBackgroundElement(el, vbW, vbH)) return;
        foregroundShapes.push(el);
      });

      const N = foregroundShapes.length;
      if (N > 0) {
        foregroundShapes.forEach((el, i) => {
          const phase_i = (i / N) * 2 * Math.PI;
          const opacity = 0.55 + 0.45 * Math.cos(2 * Math.PI * count * progress - phase_i);
          (el as HTMLElement).style.opacity = String(opacity);
          el.setAttribute('opacity', String(opacity));
        });
      }
      break;
    }

    case 'progress': {
      // Deterministic linear progress: p(t) = t / duration (0.0 to 1.0)
      // ID CONVENTION:
      // If SVG contains id="progress-fill", set width to originalWidth * p (grow left to right, keep x anchored)
      // If SVG contains id="progress-text", set textContent to Math.round(p * 100) + "%"
      // Background rect is never touched (protected by isBackgroundElement)
      const fillEl = doc.getElementById('progress-fill') || root.querySelector('#progress-fill');
      if (fillEl && !isBackgroundElement(fillEl, vbW, vbH)) {
        let originalWidth = 0;
        const wAttr = fillEl.getAttribute('data-original-width') || fillEl.getAttribute('width');
        if (wAttr) {
          originalWidth = parseFloat(wAttr) || 0;
        } else if ((fillEl as HTMLElement).style?.width) {
          originalWidth = parseFloat((fillEl as HTMLElement).style.width) || 0;
        }

        if (!fillEl.hasAttribute('data-original-width') && originalWidth > 0) {
          fillEl.setAttribute('data-original-width', String(originalWidth));
        }

        const currentW = Math.max(0, originalWidth * progress);
        fillEl.setAttribute('width', String(currentW));
        if ((fillEl as HTMLElement).style?.width) {
          (fillEl as HTMLElement).style.width = `${currentW}px`;
        }
      }

      const textEl = doc.getElementById('progress-text') || root.querySelector('#progress-text');
      if (textEl) {
        textEl.textContent = `${Math.round(progress * 100)}%`;
      }
      break;
    }

    case 'progress-follow': {
      // Grows #progress-fill width 0 to 100% and updates #progress-text to 0% to 100%
      // #progress-text moves horizontally so it stays just to the right of the fill edge (edge + 16px, left-aligned).
      // When text would run past the right edge of the viewBox, place it just inside the fill edge (edge - 16px, right-aligned).
      // Vertical position stays exactly as authored in SVG.
      const fillEl = doc.getElementById('progress-fill') || root.querySelector('#progress-fill');
      let fillX = 0;
      let currentW = 0;

      if (fillEl && !isBackgroundElement(fillEl, vbW, vbH)) {
        let originalWidth = 0;
        const wAttr = fillEl.getAttribute('data-original-width') || fillEl.getAttribute('width');
        if (wAttr) {
          originalWidth = parseFloat(wAttr) || 0;
        } else if ((fillEl as HTMLElement).style?.width) {
          originalWidth = parseFloat((fillEl as HTMLElement).style.width) || 0;
        }

        if (!fillEl.hasAttribute('data-original-width') && originalWidth > 0) {
          fillEl.setAttribute('data-original-width', String(originalWidth));
        }

        const xAttr = fillEl.getAttribute('data-original-x') || fillEl.getAttribute('x');
        if (xAttr) {
          fillX = parseFloat(xAttr) || 0;
        } else if ((fillEl as HTMLElement).style?.left) {
          fillX = parseFloat((fillEl as HTMLElement).style.left) || 0;
        }
        if (!fillEl.hasAttribute('data-original-x')) {
          fillEl.setAttribute('data-original-x', String(fillX));
        }

        currentW = Math.max(0, originalWidth * progress);
        fillEl.setAttribute('width', String(currentW));
        if ((fillEl as HTMLElement).style?.width) {
          (fillEl as HTMLElement).style.width = `${currentW}px`;
        }
      } else {
        fillX = vbX;
        currentW = vbW * progress;
      }

      const textEl = doc.getElementById('progress-text') || root.querySelector('#progress-text');
      if (textEl) {
        const textContent = `${Math.round(progress * 100)}%`;
        textEl.textContent = textContent;

        const edge = fillX + currentW;

        // Determine font size & estimated text width to detect if running past viewBox right edge
        const fontAttr = textEl.getAttribute('font-size') ||
          textEl.closest('[font-size]')?.getAttribute('font-size') ||
          (textEl as HTMLElement).style?.fontSize || '16';
        const fontSize = parseFloat(fontAttr) || 16;
        const letterSpacing = parseFloat(textEl.getAttribute('letter-spacing') || '0') || 0;

        let textWidth = 0;
        try {
          if ((textEl as any).getComputedTextLength) {
            textWidth = (textEl as any).getComputedTextLength();
          }
        } catch {}

        if (!textWidth) {
          try {
            if (typeof document !== 'undefined') {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const fontFamily = textEl.getAttribute('font-family') || (textEl as HTMLElement).style?.fontFamily || 'Arial, sans-serif';
                ctx.font = `${fontSize}px ${fontFamily}`;
                textWidth = ctx.measureText(textContent).width;
              }
            }
          } catch {}
        }

        if (!textWidth || textWidth <= 0) {
          textWidth = textContent.length * fontSize * 0.6 + letterSpacing * textContent.length;
        }

        const vbRight = vbX + vbW;
        const wouldRunPast = (edge + 16 + textWidth) > vbRight;

        if (wouldRunPast) {
          // Inside fill edge, right-aligned
          const posX = edge - 16;
          textEl.setAttribute('x', String(posX));
          textEl.setAttribute('text-anchor', 'end');
          (textEl as HTMLElement).style.textAnchor = 'end';
        } else {
          // Right of fill edge, left-aligned
          const posX = edge + 16;
          textEl.setAttribute('x', String(posX));
          textEl.setAttribute('text-anchor', 'start');
          (textEl as HTMLElement).style.textAnchor = 'start';
        }
        // y is not modified, so vertical position stays exactly as authored
      }
      break;
    }

    case 'slide-block': {
      // #slide-block slides horizontally inside #slide-track (or full viewBox width if no track)
      // 2 full round trips (left-right-left) over duration: tri in [0, 1]
      // x = trackX + tri * (trackWidth - blockWidth), clamped
      const trackEl = doc.getElementById('slide-track') || root.querySelector('#slide-track');
      let trackX = vbX;
      let trackWidth = vbW;

      if (trackEl) {
        if (trackEl.hasAttribute('x') && trackEl.hasAttribute('width')) {
          trackX = parseFloat(trackEl.getAttribute('x') || '0') || 0;
          trackWidth = parseFloat(trackEl.getAttribute('width') || '0') || 0;
        } else if (trackEl.hasAttribute('x1') && trackEl.hasAttribute('x2')) {
          const x1 = parseFloat(trackEl.getAttribute('x1') || '0') || 0;
          const x2 = parseFloat(trackEl.getAttribute('x2') || '0') || 0;
          trackX = Math.min(x1, x2);
          trackWidth = Math.abs(x2 - x1);
        } else if ((trackEl as HTMLElement).style?.width) {
          trackWidth = parseFloat((trackEl as HTMLElement).style.width) || vbW;
          if ((trackEl as HTMLElement).style?.left) {
            trackX = parseFloat((trackEl as HTMLElement).style.left) || 0;
          }
        }
        if (trackWidth <= 0) {
          trackX = vbX;
          trackWidth = vbW;
        }
      }

      const blockEl = doc.getElementById('slide-block') || root.querySelector('#slide-block');
      if (blockEl) {
        // Keep block's original x as the left edge reference
        let origX = 0;
        const origXAttr = blockEl.getAttribute('data-original-x') || blockEl.getAttribute('x');
        if (origXAttr) {
          origX = parseFloat(origXAttr) || 0;
        } else if (blockEl.getAttribute('cx')) {
          origX = parseFloat(blockEl.getAttribute('cx') || '0') || 0;
        }
        if (!blockEl.hasAttribute('data-original-x')) {
          blockEl.setAttribute('data-original-x', String(origX));
        }

        // Support rect blocks (x/width)
        let blockWidth = 0;
        const wAttr = blockEl.getAttribute('data-original-width') || blockEl.getAttribute('width');
        if (wAttr) {
          blockWidth = parseFloat(wAttr) || 0;
        } else if ((blockEl as HTMLElement).style?.width) {
          blockWidth = parseFloat((blockEl as HTMLElement).style.width) || 0;
        } else if (blockEl.getAttribute('r')) {
          blockWidth = (parseFloat(blockEl.getAttribute('r') || '0') || 0) * 2;
        }
        if (!blockEl.hasAttribute('data-original-width') && blockWidth > 0) {
          blockEl.setAttribute('data-original-width', String(blockWidth));
        }

        // 2 full round trips (left-right-left) over progress 0..1:
        // Trip 1 in [0, 0.5], Trip 2 in [0.5, 1.0]
        const cycle = (progress * 2) % 1;
        const tri = progress >= 1 ? 0 : 1 - Math.abs(2 * cycle - 1);
        const clampedTri = Math.max(0, Math.min(1, tri));

        const maxTravel = Math.max(0, trackWidth - blockWidth);
        const minX = trackX;
        const maxX = trackX + maxTravel;
        let targetX = trackX + clampedTri * maxTravel;
        targetX = Math.max(minX, Math.min(maxX, targetX));

        const tag = blockEl.nodeName.toLowerCase();
        if (tag === 'rect') {
          blockEl.setAttribute('x', String(targetX));
          if ((blockEl as HTMLElement).style?.left) (blockEl as HTMLElement).style.left = `${targetX}px`;
          if ((blockEl as HTMLElement).style?.x) (blockEl as HTMLElement).style.x = `${targetX}px`;
        } else if (tag === 'circle') {
          const r = parseFloat(blockEl.getAttribute('r') || '0') || 0;
          blockEl.setAttribute('cx', String(targetX + r));
        } else {
          const dx = targetX - origX;
          blockEl.setAttribute('transform', `translate(${dx} 0)`);
        }
      }
      break;
    }

    case 'fade-in': {
      const opacity = easeOutCubic(progress);
      wrapChildrenInGroup(doc, root, '', `opacity: ${opacity};`, vbW, vbH);
      break;
    }

    case 'zoom-in': {
      const ease = easeOutCubic(progress);
      const scale = 0.2 + 0.8 * ease;
      const opacity = Math.min(1, progress * 2.2);
      const transform = `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
      wrapChildrenInGroup(doc, root, transform, `opacity: ${opacity};`, vbW, vbH);
      break;
    }

    case 'rotate-in': {
      const ease = easeOutCubic(progress);
      const angle = (1 - ease) * -180;
      const scale = 0.35 + 0.65 * ease;
      const opacity = Math.min(1, progress * 2.0);
      const transform = `translate(${cx} ${cy}) rotate(${angle}) scale(${scale}) translate(${-cx} ${-cy})`;
      wrapChildrenInGroup(doc, root, transform, `opacity: ${opacity};`, vbW, vbH);
      break;
    }

    case 'slide-up': {
      const ease = easeOutCubic(progress);
      const dy = (1 - ease) * (vbH * 0.32 || 120);
      const opacity = Math.min(1, progress * 2.2);
      const transform = `translate(0 ${dy})`;
      wrapChildrenInGroup(doc, root, transform, `opacity: ${opacity};`, vbW, vbH);
      break;
    }

    case 'pulse-loop': {
      // Loop smoothly using sine wave
      const cycles = Math.max(1, Math.round(duration * 0.8));
      const wave = Math.sin(progress * Math.PI * 2 * cycles);
      const scale = 1 + 0.12 * wave;
      const transform = `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
      wrapChildrenInGroup(doc, root, transform, '', vbW, vbH);
      break;
    }

    case 'spin-continuous': {
      // Rotates the entire SVG content continuously around center for the whole duration
      const count = typeof spinCount === 'number' && spinCount > 0
        ? spinCount
        : Math.max(1, Math.round(duration / 2));
      const angle = progress * 360 * count;
      const transform = `translate(${cx} ${cy}) rotate(${angle}) translate(${-cx} ${-cy})`;
      wrapChildrenInGroup(doc, root, transform, '', vbW, vbH);
      break;
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

/**
 * Wraps all top-level graphic children inside a <g> tag with transform/style
 */
function wrapChildrenInGroup(
  doc: XMLDocument,
  root: Element,
  transform: string,
  style: string,
  vbW?: number,
  vbH?: number
) {
  const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  if (transform) g.setAttribute('transform', transform);
  if (style) {
    g.setAttribute('style', style);
    const m = style.match(/opacity:\s*([\d.]+)/);
    if (m) {
      g.setAttribute('opacity', m[1]);
    }
  }

  // Preserve <defs> and full-frame background rect at root, wrap all foreground elements
  const childrenToMove: Node[] = [];
  Array.from(root.childNodes).forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.nodeName.toLowerCase();
      if (tag === 'defs') {
        return; // Keep defs at root
      }
      if (vbW && vbH && isBackgroundElement(el, vbW, vbH)) {
        return; // Keep background rect at root so backdrop stays solid and edge-to-edge!
      }
    }
    childrenToMove.push(child);
  });

  childrenToMove.forEach(c => g.appendChild(c));
  root.appendChild(g);
}
