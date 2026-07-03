import { categoryFolderForLabel } from "./paths";
import { parseTypedTitle } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

/** VirtualDJ-facing metadata stored on exported MP4 + harvest manifest. */
export type HarvestVdjMetadata = {
  artist: string;
  title: string;
  genre: string;
  year?: number;
  grouping: string;
  rvTags?: string;
};

export type HarvestMetadataInput = {
  title: string;
  category?: string;
  artist?: string | null;
  displayTitle?: string | null;
  rvTags?: string | null;
};

export type HarvestMetadataContext = {
  sourceProgram: string;
  year?: number;
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function isGenericSubject(subject: string): boolean {
  const s = subject.trim().toLowerCase();
  return !s || s === "segment" || s === "untitled";
}

/**
 * Resolve harvest metadata for VirtualDJ ingestion.
 *
 * Artist: primary entity → fallback source program.
 * Title: accepted clip title (displayTitle or raw title).
 * Genre: curator category button label.
 * Year: source program year (optional).
 * Grouping: source program title.
 */
export function resolveHarvestClipMetadata(
  item: HarvestMetadataInput,
  context: HarvestMetadataContext,
): HarvestVdjMetadata {
  const sourceProgram = clean(context.sourceProgram) || "Media Lab";
  const parsed = parseTypedTitle(item.title);
  const subjectFromTitle = clean(parsed.subject);
  const artistHint = clean(item.artist);

  let artist = "";
  if (artistHint && !isGenericSubject(artistHint)) {
    artist = artistHint;
  } else if (subjectFromTitle && !isGenericSubject(subjectFromTitle)) {
    artist = subjectFromTitle;
  } else {
    artist = sourceProgram;
  }

  const title = clean(item.displayTitle) || clean(item.title) || "Untitled";
  const genre = categoryFolderForLabel(item.category);

  let year: number | undefined;
  if (typeof context.year === "number" && context.year >= 1900 && context.year < 2100) {
    year = context.year;
  }

  const grouping = sourceProgram;
  const rvTagsRaw = clean(item.rvTags);

  return {
    artist,
    title,
    genre,
    grouping,
    ...(year != null ? { year } : {}),
    ...(rvTagsRaw ? { rvTags: rvTagsRaw } : {}),
  };
}

/** ffmpeg `-metadata` pairs for MP4 container tags VirtualDJ reads on scan. */
export function harvestMetadataToFfmpegArgs(meta: HarvestVdjMetadata): string[] {
  const args: string[] = [];
  const push = (key: string, value: string | undefined) => {
    const v = value?.trim();
    if (!v) return;
    args.push("-metadata", `${key}=${v}`);
  };

  push("artist", meta.artist);
  push("title", meta.title);
  push("genre", meta.genre);
  push("album", meta.grouping);
  push("grouping", meta.grouping);
  if (meta.year != null) {
    push("date", String(meta.year));
    push("year", String(meta.year));
  }
  if (meta.rvTags) {
    push("comment", meta.rvTags);
    push("description", meta.rvTags);
  }

  return args;
}
