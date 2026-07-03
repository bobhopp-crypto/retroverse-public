import "server-only";

import { readFile } from "fs/promises";

import { directorRenderSpecPath } from "@/lib/studio/package";
import { normalizeRvtr } from "@/lib/studio/status";

import { parseRenderSpec } from "./parse-render-spec";
import type { ParsedExperience } from "./types";

export async function loadExperienceRenderSpec(rvtr: string): Promise<ParsedExperience | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  try {
    const raw = await readFile(directorRenderSpecPath(normalized), "utf8");
    return parseRenderSpec(JSON.parse(raw));
  } catch {
    return null;
  }
}
