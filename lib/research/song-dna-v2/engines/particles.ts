import { mulberry32 } from "../seeds";
import { paletteFromWarmth } from "../palette";
import type { CompositionLayout } from "./composition";
import type { SongDnaV2Controls } from "../types";
import { CANVAS } from "../types";

const W = CANVAS;
const H = CANVAS;

export function renderParticleEngine(
  seed: number,
  controls: SongDnaV2Controls,
  layout: CompositionLayout,
): string {
  const rand = mulberry32(seed);
  const palette = paletteFromWarmth(controls.warmth);
  const count = Math.round(controls.sparkCount * (0.35 + controls.repetition * 0.65));
  const frag = controls.fragmentation;
  const parts: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const bias = rand();
    const px =
      layout.focalX * (0.3 + bias * 0.4) + rand() * W * (0.15 + controls.emptySpace * 0.35);
    const py =
      layout.focalY * (0.3 + bias * 0.4) + rand() * H * (0.15 + controls.emptySpace * 0.35);
    const size = 1.2 + rand() * (3 + controls.strokeWeight * 6);
    const op = (0.2 + rand() * 0.6 * (0.3 + controls.glowStrength * 0.7)).toFixed(3);
    const color = rand() > 0.5 ? palette.hot : palette.cool;

    if (frag > 0.35 && rand() < frag) {
      const spikes = 3 + Math.floor(rand() * 4);
      const pts: string[] = [];
      for (let s = 0; s < spikes; s += 1) {
        const a = (s / spikes) * Math.PI * 2 + rand() * 0.5;
        const r = size * (0.5 + rand());
        pts.push(`${(px + Math.cos(a) * r).toFixed(1)},${(py + Math.sin(a) * r).toFixed(1)}`);
      }
      parts.push(`<polygon points="${pts.join(" ")}" fill="${color}" opacity="${op}"/>`);
    } else {
      parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size.toFixed(2)}" fill="${color}" opacity="${op}"/>`);
    }
  }

  return `<g id="v2-particles">${parts.join("\n")}</g>`;
}
