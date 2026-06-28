import { mulberry32 } from "../seeds";
import { paletteFromWarmth } from "../palette";
import type { CompositionLayout } from "./composition";
import type { SongDnaV2Controls } from "../types";
import { CANVAS } from "../types";

const KEY_HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export function renderSignatureEngine(
  seed: number,
  controls: SongDnaV2Controls,
  layout: CompositionLayout,
): string {
  const rand = mulberry32(seed);
  const palette = paletteFromWarmth(controls.warmth);
  const key = controls.metrics.key;
  const mode = controls.metrics.mode;
  const hue =
    key != null && key >= 0 && key <= 11 ? KEY_HUES[key]! : 28 + Math.floor(rand() * 300);
  const sat = mode === 0 ? 42 : mode === 1 ? 78 : 58;
  const light = mode === 0 ? 52 : 62;
  const sigColor = `hsl(${hue} ${sat}% ${light}%)`;

  const markCount = 4 + Math.floor(rand() * 5);
  const marks: string[] = [];

  for (let i = 0; i < markCount; i += 1) {
    const angle = (i / markCount) * Math.PI * 2 + rand() * 0.6;
    const dist = 40 + rand() * (90 + controls.repetition * 80);
    const cx = layout.focalX + Math.cos(angle) * dist;
    const cy = layout.focalY + Math.sin(angle) * dist;
    const r = 4 + rand() * (8 + controls.glowStrength * 10);
    const op = (0.35 + rand() * 0.45).toFixed(3);
    marks.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${sigColor}" opacity="${op}" filter="url(#v2-sig-blur)"/>`);
  }

  const ringR = 28 + rand() * 22;
  marks.push(
    `<circle cx="${layout.focalX.toFixed(1)}" cy="${layout.focalY.toFixed(1)}" r="${ringR.toFixed(1)}" fill="none" stroke="${sigColor}" stroke-width="1.5" opacity="0.5"/>`,
  );

  return `<g id="v2-signature">${marks.join("\n")}</g>`;
}

export function signatureBlurDef(): string {
  return `<filter id="v2-sig-blur" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="3"/>
  </filter>`;
}
