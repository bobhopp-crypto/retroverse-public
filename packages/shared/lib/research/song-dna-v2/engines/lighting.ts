import { mulberry32 } from "../seeds";
import { paletteFromWarmth } from "../palette";
import type { CompositionLayout } from "./composition";
import type { SongDnaV2Controls } from "../types";
import { CANVAS } from "../types";

const W = CANVAS;
const H = CANVAS;

export function renderLightingEngine(
  seed: number,
  controls: SongDnaV2Controls,
  layout: CompositionLayout,
): string {
  const rand = mulberry32(seed);
  const palette = paletteFromWarmth(controls.warmth);
  const strength = controls.glowStrength;
  const beamCount = 2 + Math.floor(rand() * 3);

  const beams: string[] = [];
  for (let i = 0; i < beamCount; i += 1) {
    const angle = rand() * Math.PI * 2;
    const spread = 40 + strength * 120;
    const x2 = layout.focalX + Math.cos(angle) * (W * 0.55);
    const y2 = layout.focalY + Math.sin(angle) * (H * 0.55);
    const op = (0.04 + strength * 0.18 + rand() * 0.06).toFixed(3);
    beams.push(
      `<line x1="${layout.focalX.toFixed(1)}" y1="${layout.focalY.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${palette.hot}" stroke-width="${spread.toFixed(1)}" stroke-linecap="round" opacity="${op}" filter="url(#v2-light-blur)"/>`,
    );
  }

  const haloOp = (0.1 + strength * 0.45).toFixed(3);
  const haloR = 120 + strength * 380 + rand() * 80;

  return `<g id="v2-lighting">
    <radialGradient id="v2-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.hot}" stop-opacity="${haloOp}"/>
      <stop offset="55%" stop-color="${palette.accent}" stop-opacity="${(Number(haloOp) * 0.35).toFixed(3)}"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <ellipse cx="${layout.focalX.toFixed(1)}" cy="${layout.focalY.toFixed(1)}" rx="${haloR.toFixed(1)}" ry="${(haloR * 0.82).toFixed(1)}" fill="url(#v2-halo)"/>
    ${beams.join("\n")}
  </g>`;
}

export function lightingBlurDef(): string {
  return `<filter id="v2-light-blur" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="18"/>
  </filter>`;
}
