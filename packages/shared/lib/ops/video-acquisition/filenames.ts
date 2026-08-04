import { sanitizeHarvestFilename } from "@/lib/ops/media-lab/harvest/filenames";

export function sanitizeProductionFilenamePart(text: string): string {
  return sanitizeHarvestFilename(text);
}

export function productionVideoFilename(artist: string, title: string, ext = "mp4"): string {
  const artistPart = sanitizeProductionFilenamePart(artist) || "Unknown Artist";
  const titlePart = sanitizeProductionFilenamePart(title) || "Unknown Title";
  const normalizedExt = ext.replace(/^\./, "").trim() || "mp4";
  return `${artistPart} - ${titlePart}.${normalizedExt}`;
}

export function productionVideoFilenameWithSuffix(
  artist: string,
  title: string,
  ext: string,
  suffixIndex: number,
): string {
  const artistPart = sanitizeProductionFilenamePart(artist) || "Unknown Artist";
  const titlePart = sanitizeProductionFilenamePart(title) || "Unknown Title";
  const normalizedExt = ext.replace(/^\./, "").trim() || "mp4";
  if (suffixIndex <= 0) {
    return `${artistPart} - ${titlePart}.${normalizedExt}`;
  }
  return `${artistPart} - ${titlePart} ${suffixIndex}.${normalizedExt}`;
}

export function productionVideoFilenameCandidates(
  artist: string,
  title: string,
  ext = "mp4",
  maxSuffix = 99,
): string[] {
  const out: string[] = [];
  for (let index = 0; index <= maxSuffix; index += 1) {
    out.push(productionVideoFilenameWithSuffix(artist, title, ext, index));
  }
  return out;
}

export function stripThePrefix(value: string): string {
  return value.replace(/^the\s+/i, "").trim();
}

export function normArtistTitleKey(artist: string, title: string): string {
  return `${stripThePrefix(title.trim()).toLowerCase()}|${stripThePrefix(artist.trim()).toLowerCase()}`;
}

export function defaultSearchQuery(artist: string, title: string): string {
  return `${artist.trim()} ${title.trim()} official video`.replace(/\s+/g, " ").trim();
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
