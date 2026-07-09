import { getTemplateDefinition } from "./templates";
import { selectTemplateId } from "./select-template";
import type {
  BroadcastAssetInput,
  ComposedBroadcastAsset,
  TemplateSelectionMode,
} from "./types";

/** Stable key for remounting composer UI when song content changes. */
export function broadcastCompositionKey(input: {
  rvtr: string;
  title: string;
  artist: string;
  coverUrl: string | null;
}): string {
  return `${input.rvtr}|${input.title}|${input.artist}|${input.coverUrl ?? ""}`;
}

export function formatAlbumYearLine(album: string | null, year: number | null): string | null {
  const albumTrim = album?.trim() ?? "";
  if (albumTrim && year) return `${albumTrim} · ${year}`;
  if (albumTrim) return albumTrim;
  if (year) return String(year);
  return null;
}

/** Compose a finished Standard Broadcast Asset from song content. */
export function composeBroadcastAsset(
  input: BroadcastAssetInput,
  mode: TemplateSelectionMode = "default",
): ComposedBroadcastAsset {
  const templateId = selectTemplateId(input.rvtr, mode);
  const template = getTemplateDefinition(templateId);

  return {
    templateId,
    templateSlug: template.slug,
    templateName: template.name,
    selectionMode: mode,
    input: {
      rvtr: input.rvtr.trim().toUpperCase(),
      title: input.title.trim(),
      artist: input.artist.trim(),
      album: input.album?.trim() ?? null,
      year: input.year,
      coverUrl: input.coverUrl?.trim() || null,
    },
  };
}
