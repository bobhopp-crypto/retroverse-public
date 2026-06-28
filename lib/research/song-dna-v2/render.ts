import { buildControls } from "./controls";
import { compositionSvg, renderCompositionEngine } from "./engines/composition";
import { backgroundBlurDef, renderBackgroundEngine } from "./engines/background";
import { lightingBlurDef, renderLightingEngine } from "./engines/lighting";
import { renderParticleEngine } from "./engines/particles";
import { renderRhythmEngine } from "./engines/rhythm";
import { renderSignatureEngine, signatureBlurDef } from "./engines/signature";
import { buildEngineSeeds } from "./seeds";
import type { AcousticMetrics } from "@/lib/research/song-dna-visual-synth/types";

import { paletteFromWarmth } from "./palette";
import type { EngineLayers, RenderStages } from "./types";
import { CANVAS } from "./types";

function wrapSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">
  <defs>
    ${backgroundBlurDef()}
    ${lightingBlurDef()}
    ${signatureBlurDef()}
  </defs>
  ${body}
</svg>`;
}

export function renderSongDnaV2(metrics: AcousticMetrics): {
  layers: EngineLayers;
  stages: RenderStages;
  seeds: ReturnType<typeof buildEngineSeeds>;
  controls: ReturnType<typeof buildControls>;
} {
  const seeds = buildEngineSeeds(metrics.rvtr);
  const controls = buildControls(metrics);
  const layout = renderCompositionEngine(seeds.composition);
  const palette = paletteFromWarmth(controls.warmth);

  const background = renderBackgroundEngine(seeds.background, controls);
  const rhythm = renderRhythmEngine(seeds.rhythm, seeds.brush, controls, layout);
  const particles = renderParticleEngine(seeds.particle, controls, layout);
  const lighting = renderLightingEngine(seeds.lighting, controls, layout);
  const composition = compositionSvg(layout, palette);
  const signature = renderSignatureEngine(seeds.signature, controls, layout);

  const layers: EngineLayers = {
    background,
    rhythm,
    particles,
    lighting,
    composition,
    signature,
    layout,
  };

  const stages: RenderStages = {
    "01-background": wrapSvg(background),
    "02-rhythm": wrapSvg(`${background}\n${rhythm}`),
    "03-particles": wrapSvg(`${background}\n${rhythm}\n${particles}`),
    "04-lighting": wrapSvg(`${background}\n${rhythm}\n${particles}\n${lighting}`),
    "05-final": wrapSvg(`${background}\n${rhythm}\n${particles}\n${lighting}\n${composition}\n${signature}`),
  };

  return { layers, stages, seeds, controls };
}

export function renderSongDnaV2Hash(metrics: AcousticMetrics): string {
  const { stages } = renderSongDnaV2(metrics);
  const svg = stages["05-final"];
  let h = 2166136261;
  for (let i = 0; i < svg.length; i += 1) {
    h ^= svg.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
