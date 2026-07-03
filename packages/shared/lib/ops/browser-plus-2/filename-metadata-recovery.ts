import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

export type MetadataRecoveryConfidence = "high" | "medium" | "low" | "none";

export type FilenameMetadataRecovery = {
  artist: string | null;
  title: string | null;
  confidence: MetadataRecoveryConfidence;
  hasRecovery: boolean;
};

/** Strip extension and trim whitespace from a VDJ filename. */
export function filenameBaseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

/**
 * Parse `Artist - Title.ext` filenames.
 * Returns null parts when the pattern is ambiguous.
 */
export function parseFilenameMetadata(fileName: string): { artist: string | null; title: string | null } {
  const base = filenameBaseName(fileName);
  const separator = " - ";
  const idx = base.indexOf(separator);
  if (idx <= 0) return { artist: null, title: null };

  const artist = base.slice(0, idx).trim();
  const title = base.slice(idx + separator.length).trim();
  if (!artist || !title) return { artist: null, title: null };
  if (artist.length > 120 || title.length > 180) return { artist: null, title: null };

  return { artist, title };
}

export function assessRecoveryConfidence(
  fileName: string,
  artist: string | null,
  title: string | null,
): MetadataRecoveryConfidence {
  if (!artist || !title) return "none";

  const base = filenameBaseName(fileName);
  const separator = " - ";
  const idx = base.indexOf(separator);
  if (idx <= 0) return "none";

  const left = base.slice(0, idx).trim();
  const right = base.slice(idx + separator.length).trim();
  if (left !== artist || right !== title) return "medium";

  if (/^\d/.test(artist) && !/\d/.test(fileName)) return "medium";
  if (title.includes(" - ")) return "medium";
  if (/\bMEDLEY\b/i.test(title) || /\([^)]{40,}\)/.test(title)) return "medium";

  return "high";
}

export function analyzeFilenameMetadataRecovery(fileName: string): FilenameMetadataRecovery {
  const parsed = parseFilenameMetadata(fileName);
  const confidence = assessRecoveryConfidence(fileName, parsed.artist, parsed.title);
  return {
    artist: parsed.artist,
    title: parsed.title,
    confidence,
    hasRecovery: confidence === "high" || confidence === "medium",
  };
}

export function hasXmlArtist(row: Pick<BrowserPlusRow, "artist">): boolean {
  return Boolean(row.artist?.trim());
}

export function hasXmlTitle(row: Pick<BrowserPlusRow, "title">): boolean {
  return Boolean(row.title?.trim());
}

export function isMissingXmlMetadata(row: Pick<BrowserPlusRow, "artist" | "title">): boolean {
  return !hasXmlArtist(row) || !hasXmlTitle(row);
}

export type MetadataDisplayField = {
  value: string;
  recoveredFromFilename: boolean;
  empty: boolean;
};

/** Presentation-only display values for Browser Plus table/inspector. */
export function metadataDisplayArtist(
  row: Pick<BrowserPlusRow, "artist" | "fileName"> & {
    recoveredArtist?: string | null;
    recoveryConfidence?: MetadataRecoveryConfidence;
  },
): MetadataDisplayField {
  if (hasXmlArtist(row)) {
    return { value: row.artist.trim(), recoveredFromFilename: false, empty: false };
  }
  if (row.recoveryConfidence === "high" && row.recoveredArtist?.trim()) {
    return { value: row.recoveredArtist.trim(), recoveredFromFilename: true, empty: false };
  }
  return { value: "—", recoveredFromFilename: false, empty: true };
}

export function metadataDisplayTitle(
  row: Pick<BrowserPlusRow, "title" | "fileName"> & {
    recoveredTitle?: string | null;
    recoveryConfidence?: MetadataRecoveryConfidence;
  },
): MetadataDisplayField {
  if (hasXmlTitle(row)) {
    return { value: row.title.trim(), recoveredFromFilename: false, empty: false };
  }
  if (row.recoveryConfidence === "high" && row.recoveredTitle?.trim()) {
    return { value: row.recoveredTitle.trim(), recoveredFromFilename: true, empty: false };
  }
  const fallback = row.fileName?.trim() || "—";
  return { value: fallback, recoveredFromFilename: false, empty: !row.fileName?.trim() };
}
