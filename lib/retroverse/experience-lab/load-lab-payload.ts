import "server-only";

import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadExperienceRenderSpec } from "@/lib/retroverse/renderer/load-render-spec";
import { buildVisualLibrary } from "@/lib/retroverse/visual-library/build-visual-library";
import { normalizeRvtr } from "@/lib/studio/status";

import type { ExperienceLabPayload } from "./types";

export type { ExperienceLabPayload } from "./types";

export async function loadExperienceLabPayload(rvtr: string): Promise<ExperienceLabPayload | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  const experience = await loadExperienceRenderSpec(normalized);
  if (!experience) return null;

  const songDna = await loadSongDnaPackage(normalized);
  const visualLibrary = await buildVisualLibrary(normalized);

  return { experience, songDna, visualLibrary };
}
