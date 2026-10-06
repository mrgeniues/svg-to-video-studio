/**
 * Animation and SVG Processing Utilities for SVG to Video Studio
 */

export type AnimationStyle =
  | 'draw-on'
  | 'pulse'
  | 'fade-in'
  | 'zoom-in'
  | 'rotate-in'
  | 'slide-up'
  | 'pulse-loop'
  | 'spin-continuous';

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
