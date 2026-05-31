export type ArtistSection =
  | "albums"
  | "songs"
  | "tracks"
  | "years"
  | "library"
  | "explore"
  | "related"
  | "charts";

export function artistSectionHref(slug: string, section: ArtistSection): string {
  return `/artist/${slug}/${section}`;
}
