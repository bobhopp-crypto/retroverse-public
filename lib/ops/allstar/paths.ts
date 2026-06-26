import { existsSync } from "fs";
import { join } from "path";

/** External All-Star Baseball data root (scans, future MLB stats). */
export function allstarDataRoot(): string {
  const fromEnv = process.env.ALLSTAR_DATA_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const defaultPath = "/Users/bobhopp/Documents/All Star Baseball";
  if (existsSync(defaultPath)) return defaultPath;
  return fromEnv || defaultPath;
}

export function allstarScansDir(): string {
  return join(allstarDataRoot(), "Scans");
}

/** Extractor pipeline output (CSV + review images). */
export function allstarExtractorOutputDir(): string {
  const fromEnv = process.env.ALLSTAR_EXTRACTOR_OUTPUT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const toolOutput = join(process.cwd(), "tools", "allstar-disc-extractor", "output");
  if (existsSync(toolOutput)) return toolOutput;
  const dataOutput = join(process.cwd(), "data", "ops", "allstar");
  if (existsSync(dataOutput)) return dataOutput;
  return toolOutput;
}

export function allstarPlayersCsvPath(): string {
  return join(allstarExtractorOutputDir(), "allstar_players.csv");
}

export function allstarProbabilitiesCsvPath(): string {
  return join(allstarExtractorOutputDir(), "allstar_players_probabilities.csv");
}

export function allstarReviewDir(): string {
  return join(allstarExtractorOutputDir(), "review");
}

export function allstarManifestPath(): string {
  return join(allstarExtractorOutputDir(), "manifest.json");
}

export function allstarArchiveDir(): string {
  return join(allstarExtractorOutputDir(), "archive");
}

export function allstarLiveStatePath(): string {
  return join(allstarExtractorOutputDir(), "live-state.json");
}

export function allstarActivityPath(): string {
  return join(allstarExtractorOutputDir(), "activity.jsonl");
}

/** Bundled ops copy for deploy/read-only fallback. */
export function allstarBundledDataDir(): string {
  return join(process.cwd(), "data", "ops", "allstar");
}

export function allstarCanonicalScansDir(): string {
  return join(allstarBundledDataDir(), "canonical-scans");
}
