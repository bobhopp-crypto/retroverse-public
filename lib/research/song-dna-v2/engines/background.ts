import { mulberry32 } from "../seeds";
import { paletteFromWarmth } from "../palette";
import type { SongDnaV2Controls } from "../types";
import { CANVAS } from "../types";

const W = CANVAS;
const H = CANVAS;

export function renderBackgroundEngine(
  seed: number,
  controls: SongDnaV2Controls,
): string {
  const rand = mulberry32(seed);
  const palette = paletteFromWarmth(controls.warmth);
  const blobCount = Math.round(4 + controls.atmosphereDensity * 28);
  const voidRadius = controls.emptySpace * Math.min(W, H) * 0.42;
  const cx = W * (0.35 + rand() * 0.3);
  const cy = H * (0.3 + rand() * 0.4);

  const blobs: string[] = [];
  for (let i = 0; i < blobCount; i += 1) {
    const bx = rand() * W;
    const by = rand() * H;
    const dist = Math.hypot(bx - cx, by - cy);
    if (dist < voidRadius) continue;

    const rx = 60 + rand() * (120 + controls.atmosphereDensity * 180);
    const ry = 50 + rand() * (100 + controls.atmosphereDensity * 140);
    const color = rand() > 0.5 ? palette.mid : palette.cool;
    const op = (0.04 + controls.atmosphereDensity * 0.22 + rand() * 0.06).toFixed(3);
    blobs.push(
      `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}" opacity="${op}" filter="url(#v2-atmo-blur)"/>`,
    );
  }

  const vignetteOp = (0.35 + controls.emptySpace * 0.45).toFixed(3);
  const washOp = (0.12 + controls.warmth * 0.28).toFixed(3);

  return `<g id="v2-background">
    <rect width="${W}" height="${H}" fill="${palette.void}"/>
    <rect width="${W}" height="${H}" fill="${palette.deep}" opacity="${washOp}"/>
    ${blobs.join("\n")}
    <radialGradient id="v2-void-mask" cx="${(cx / W).toFixed(3)}" cy="${(cy / H).toFixed(3)}" r="50%">
      <stop offset="0%" stop-color="#000" stop-opacity="${vignetteOp}"/>
      <stop offset="${(voidRadius / (W * 0.5)).toFixed(3)}" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <rect width="${W}" height="${H}" fill="url(#v2-void-mask)"/>
  </g>`;
}

export function backgroundBlurDef(): string {
  return `<filter id="v2-atmo-blur" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="28"/>
  </filter>`;
}
