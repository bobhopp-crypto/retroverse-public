import type { VisualProfile } from "@/lib/visual-profile/types";

export type AvailableVisual = {
  id: string;
  label: string;
  url: string | null;
  selectable: boolean;
};

const FUTURE_SLOTS: Array<{ id: string; label: string }> = [
  { id: "generated-hero-2", label: "Generated Hero" },
  { id: "artist-photo", label: "Artist Photo" },
  { id: "poster", label: "Poster" },
  { id: "video-still", label: "Video Still" },
];

/** Map Visual Profile slots to user-facing thumbnail labels — no data model change. */
export function buildAvailableVisuals(profile: VisualProfile): AvailableVisual[] {
  const items: AvailableVisual[] = [];
  const secondary = profile.secondaryHero.url?.trim() || null;
  const primary = profile.primaryHero.url?.trim() || null;
  const tertiary = profile.tertiaryHero.url?.trim() || null;

  if (secondary) {
    items.push({
      id: "album-cover",
      label: "Album Cover",
      url: secondary,
      selectable: true,
    });
  }

  if (primary && primary !== secondary) {
    items.push({
      id: "generated-hero",
      label: "Generated Hero",
      url: primary,
      selectable: true,
    });
  }

  if (tertiary && tertiary !== primary && tertiary !== secondary) {
    items.push({
      id: "artist-photo-live",
      label: "Artist Photo",
      url: tertiary,
      selectable: true,
    });
  }

  for (const slot of FUTURE_SLOTS) {
    if (items.some((item) => item.id === slot.id)) continue;
    items.push({ ...slot, url: null, selectable: false });
  }

  return items;
}

export function findVisualForUrl(
  visuals: AvailableVisual[],
  url: string | null,
): AvailableVisual | null {
  if (!url) return null;
  return visuals.find((visual) => visual.url === url) ?? null;
}
