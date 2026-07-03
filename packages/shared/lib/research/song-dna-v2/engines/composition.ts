import { mulberry32 } from "../seeds";
import { CANVAS } from "../types";

export type CompositionLayout = {
  focalX: number;
  focalY: number;
  /** 0 radial · 1 diagonal sweep · 2 spiral · 3 twin-arc */
  structure: number;
  arcs: Array<{ d: string; weight: number }>;
  /** Normalized anchor points rhythm engine follows. */
  anchors: Array<{ x: number; y: number; angle: number }>;
};

const W = CANVAS;
const H = CANVAS;

export function renderCompositionEngine(seed: number): CompositionLayout {
  const rand = mulberry32(seed);
  const structure = Math.floor(rand() * 4);
  const focalX = 0.22 + rand() * 0.56;
  const focalY = 0.18 + rand() * 0.64;
  const fx = focalX * W;
  const fy = focalY * H;

  const arcs: CompositionLayout["arcs"] = [];
  const anchors: CompositionLayout["anchors"] = [];
  const arcCount = 3 + Math.floor(rand() * 3);

  for (let i = 0; i < arcCount; i += 1) {
    const t = i / Math.max(arcCount - 1, 1);
    const spread = 140 + rand() * 280;

    if (structure === 0) {
      const angle = (i / arcCount) * Math.PI * 2 + rand() * 0.4;
      const r = spread * (0.6 + rand() * 0.8);
      const x1 = fx + Math.cos(angle) * r * 0.3;
      const y1 = fy + Math.sin(angle) * r * 0.3;
      const x2 = fx + Math.cos(angle + 0.8) * r;
      const y2 = fy + Math.sin(angle + 0.8) * r;
      arcs.push({
        d: `M ${fx.toFixed(1)} ${fy.toFixed(1)} Q ${x1.toFixed(1)} ${y1.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        weight: 1.2 + rand() * 2.5,
      });
      anchors.push({ x: x2 / W, y: y2 / H, angle });
    } else if (structure === 1) {
      const y = 80 + t * (H - 160) + (rand() - 0.5) * 90;
      const leftToRight = rand() > 0.5;
      const x0 = leftToRight ? 40 : W - 40;
      const x3 = leftToRight ? W - 40 : 40;
      const bulge = spread * (rand() > 0.5 ? 1 : -1);
      arcs.push({
        d: `M ${x0} ${y.toFixed(1)} C ${(W * 0.3).toFixed(1)} ${(y + bulge).toFixed(1)}, ${(W * 0.7).toFixed(1)} ${(y - bulge).toFixed(1)}, ${x3} ${y.toFixed(1)}`,
        weight: 1.5 + rand() * 2,
      });
      anchors.push({ x: (0.25 + t * 0.5), y: y / H, angle: 0 });
    } else if (structure === 2) {
      const turns = 1.2 + rand() * 1.8;
      const steps = 24;
      let path = "";
      for (let s = 0; s <= steps; s += 1) {
        const u = s / steps;
        const theta = u * turns * Math.PI * 2;
        const r = u * spread * 1.4;
        const px = fx + Math.cos(theta) * r;
        const py = fy + Math.sin(theta) * r;
        path += s === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
        if (s % 6 === 0) anchors.push({ x: px / W, y: py / H, angle: theta });
      }
      arcs.push({ d: path, weight: 1 + rand() * 1.8 });
    } else {
      const side = i % 2 === 0 ? -1 : 1;
      const cx = fx + side * spread * 0.55;
      const cy = fy + (t - 0.5) * spread;
      arcs.push({
        d: `M ${(fx - side * 40).toFixed(1)} ${fy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${(fx + side * spread).toFixed(1)} ${(fy + (t - 0.5) * 60).toFixed(1)}`,
        weight: 2 + rand() * 3,
      });
      anchors.push({ x: cx / W, y: cy / H, angle: side * 0.7 });
    }
  }

  if (anchors.length === 0) {
    anchors.push({ x: focalX, y: focalY, angle: 0 });
  }

  return { focalX: fx, focalY: fy, structure, arcs, anchors };
}

export function compositionSvg(layout: CompositionLayout, palette: { accent: string; hot: string }): string {
  const strokes = layout.arcs
    .map(
      (a) =>
        `<path d="${a.d}" fill="none" stroke="${palette.hot}" stroke-width="${a.weight.toFixed(2)}" stroke-linecap="round" opacity="0.72"/>`,
    )
    .join("\n");

  return `<g id="v2-composition">
    ${strokes}
    <circle cx="${layout.focalX.toFixed(1)}" cy="${layout.focalY.toFixed(1)}" r="6" fill="${palette.accent}" opacity="0.85"/>
  </g>`;
}
