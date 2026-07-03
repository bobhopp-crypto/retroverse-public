import "server-only";

import { querySearchEntities } from "@/lib/search/query-search-entities";
import type { SearchEntity } from "@/lib/search/search-entity-types";

const RVAR_RE = /^RVAR\d{6}$/i;
const RVAL_RE = /^RVAL\d{6}$/i;
const RVTR_RE = /^RVTR\d{6}$/i;

function matchEntityById(entities: SearchEntity[], id: string): SearchEntity | null {
  const upper = id.trim().toUpperCase();
  return (
    entities.find((entity) => entity.rvId?.trim().toUpperCase() === upper) ??
    entities.find((entity) => entity.slug.trim().toUpperCase() === upper) ??
    null
  );
}

export async function loadExplorerEntity(input: {
  rvar?: string | null;
  rval?: string | null;
  artist?: string | null;
}): Promise<SearchEntity | null> {
  const rvar = input.rvar?.trim() ?? "";
  const rval = input.rval?.trim() ?? "";
  const artist = input.artist?.trim() ?? "";

  if (rval && RVAL_RE.test(rval)) {
    const { entities } = await querySearchEntities(rval, { mode: "overlay" });
    return matchEntityById(entities, rval) ?? entities.find((e) => e.entityType === "album") ?? null;
  }

  if (rvar && RVAR_RE.test(rvar)) {
    const { entities } = await querySearchEntities(rvar, { mode: "overlay" });
    return matchEntityById(entities, rvar) ?? entities.find((e) => e.entityType === "artist") ?? null;
  }

  if (artist) {
    const { entities } = await querySearchEntities(artist, { mode: "overlay" });
    const needle = artist.toLowerCase();
    return (
      entities.find(
        (entity) =>
          entity.entityType === "artist" &&
          entity.label.trim().toLowerCase() === needle,
      ) ??
      entities.find((entity) => entity.entityType === "artist") ??
      null
    );
  }

  return null;
}
