import { slugify } from "./slug";
import type { BroadcastSequence, RawImportImage } from "./types";

const DELIMITERS = [" - ", " – ", " — ", "_", "|", ":"];

/** Strip extension + any leading index ("12-", "Slide 12 ", "012.") from a
 * filename, leaving whatever descriptive text (if any) remains. */
function stripLeadingIndex(filename: string): string {
  const withoutExt = filename.replace(/\.(png|jpe?g)$/i, "");
  return withoutExt
    .replace(/^\s*(slide|scene|img|image)?\s*\d+\s*[-_.:]?\s*/i, "")
    .trim();
}

/** Best-effort "performer/section" label from a filename's descriptive
 * remainder. Returns null when there's no usable text signal (e.g. purely
 * numeric filenames), so the caller can fall back to fixed-size chunking. */
function extractLabel(filename: string): string | null {
  const rest = stripLeadingIndex(filename);
  if (!rest || /^\d+$/.test(rest)) return null;

  let candidate = rest;
  for (const delimiter of DELIMITERS) {
    const idx = rest.indexOf(delimiter);
    if (idx > 0) {
      candidate = rest.slice(0, idx);
      break;
    }
  }
  const normalized = candidate.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized || null;
}

function titleCase(label: string): string {
  return label
    .split(" ")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function makeSequence(
  title: string,
  startSlide: number,
  endSlide: number,
  defaultDuration: number,
): BroadcastSequence {
  return {
    id: `${slugify(title)}-${startSlide}`,
    title,
    startSlide,
    endSlide,
    slideCount: endSlide - startSlide + 1,
    defaultDuration,
    loop: false,
    autoReturn: true,
    tags: [],
    autoDetected: true,
  };
}

/** Group consecutive slides that share the exact same extracted label
 * (e.g. repeated "Queen - <song>" style filenames). Returns null slides'
 * runs with a numbered placeholder title. */
function groupByLabel(labels: (string | null)[], defaultDuration: number): BroadcastSequence[] {
  const sequences: BroadcastSequence[] = [];
  let runStart = 0;
  let runLabel: string | null = labels[0] ?? null;
  for (let i = 1; i <= labels.length; i += 1) {
    const label: string | null | undefined = i < labels.length ? labels[i] : undefined;
    if (i === labels.length || label !== runLabel) {
      const startSlide = runStart + 1;
      const endSlide = i;
      const title = runLabel ? titleCase(runLabel) : `Sequence ${sequences.length + 1}`;
      sequences.push(makeSequence(title, startSlide, endSlide, defaultDuration));
      runStart = i;
      runLabel = label ?? null;
    }
  }
  return sequences;
}

function groupByChunks(count: number, chunkSize: number, defaultDuration: number): BroadcastSequence[] {
  const sequences: BroadcastSequence[] = [];
  for (let start = 0; start < count; start += chunkSize) {
    const startSlide = start + 1;
    const endSlide = Math.min(start + chunkSize, count);
    sequences.push(makeSequence(`Sequence ${sequences.length + 1}`, startSlide, endSlide, defaultDuration));
  }
  return sequences;
}

export type DetectSequencesOptions = {
  defaultDurationSeconds?: number;
  /** Slide count per group when filenames give no usable grouping signal. */
  fallbackChunkSize?: number;
};

/**
 * First-pass, filename-driven grouping. This is intentionally a heuristic —
 * there is no OCR/vision pipeline in this repo — so results are tagged
 * `autoDetected: true` and expected to be corrected by an operator via the
 * inline sequence editor, not treated as final truth.
 *
 * Label grouping only wins when it actually merges at least one pair of
 * consecutive slides (e.g. "Queen - Radio Ga Ga.png" / "Queen - Bohemian
 * Rhapsody.png"). Decks where every filename is a unique one-off headline
 * (e.g. a narrative Gamma export) produce one label per slide — grouping
 * would be a no-op, so fixed-size chunks are a strictly better starting
 * point for manual correction in that case.
 */
export function detectSequences(
  sortedImages: RawImportImage[],
  options: DetectSequencesOptions = {},
): BroadcastSequence[] {
  const defaultDuration = options.defaultDurationSeconds ?? 8;
  const chunkSize = options.fallbackChunkSize ?? 5;

  const labels = sortedImages.map((image) => extractLabel(image.filename));
  const labelGroups = labels.some((label) => label !== null) ? groupByLabel(labels, defaultDuration) : [];

  if (labelGroups.length > 0 && labelGroups.length < sortedImages.length) {
    return labelGroups;
  }
  return groupByChunks(sortedImages.length, chunkSize, defaultDuration);
}
