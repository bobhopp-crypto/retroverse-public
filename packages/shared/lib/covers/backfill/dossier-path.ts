import { artistSlugFromName } from "@/lib/cover-integrity/normalize";
import { slugFromNormalizedLabel } from "@/lib/search/normalize-search-label";

/** Same path convention as dossier ingest + populate_album_graph_bridge. */
export function expectedDossierCoverRelPath(
  rval: string,
  artist: string,
  album: string,
  ext = "jpg",
): string {
  const id = rval.trim().toUpperCase();
  const artistSlug = artistSlugFromName(artist);
  const albumSlug = slugFromNormalizedLabel(album);
  return `retroverse/covers/${id}/${id}__${artistSlug}__${albumSlug}.${ext}`;
}

export function localWebPathFromRel(rel: string): string {
  const trimmed = rel.trim().replace(/^\/+/, "");
  return trimmed.startsWith("retroverse/") ? `/${trimmed}` : `/retroverse/covers/${trimmed}`;
}
