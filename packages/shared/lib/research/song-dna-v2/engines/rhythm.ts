import { mulberry32 } from "../seeds";
import { paletteFromWarmth } from "../palette";
import type { CompositionLayout } from "./composition";
import type { SongDnaV2Controls } from "../types";
import { CANVAS } from "../types";

const W = CANVAS;
const H = CANVAS;

export function renderRhythmEngine(
  rhythmSeed: number,
  brushSeed: number,
  controls: SongDnaV2Controls,
  layout: CompositionLayout,
): string {
  const rhythm = mulberry32(rhythmSeed);
  const brush = mulberry32(brushSeed);
  const palette = paletteFromWarmth(controls.warmth);

  const strokeCount = Math.round(8 + controls.repetition * 36);
  const baseSpacing = 18 + (1 - controls.spacing) * 55;
  const weight = 1.2 + controls.strokeWeight * 14;
  const strokes: string[] = [];

  for (let i = 0; i < strokeCount; i += 1) {
    const anchor = layout.anchors[i % layout.anchors.length]!;
    const ax = anchor.x * W;
    const ay = anchor.y * H;
    const layer = Math.floor(i / layout.anchors.length);
    const offset = layer * baseSpacing * (0.8 + rhythm() * 0.4);

    const angle = anchor.angle + (rhythm() - 0.5) * Math.PI * 0.6;
    const len = 80 + controls.strokeWeight * 320 + rhythm() * 120;
    const wobble = (brush() - 0.5) * 80;

    const x0 = ax + Math.cos(angle + Math.PI / 2) * offset;
    const y0 = ay + Math.sin(angle + Math.PI / 2) * offset;
    const x1 = x0 + Math.cos(angle) * len + wobble;
    const y1 = y0 + Math.sin(angle) * len - wobble * 0.5;
    const cx = (x0 + x1) / 2 + (brush() - 0.5) * 100;
    const cy = (y0 + y1) / 2 + (brush() - 0.5) * 100;

    const w = (weight * (0.55 + brush() * 0.9)).toFixed(2);
    const color = i % 3 === 0 ? palette.accent : i % 3 === 1 ? palette.hot : palette.mid;
    const op = (0.18 + controls.strokeWeight * 0.55).toFixed(3);

    strokes.push(
      `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`,
    );
  }

  return `<g id="v2-rhythm">${strokes.join("\n")}</g>`;
}
