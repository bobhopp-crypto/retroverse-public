import type { SearchEntity } from "@/lib/search/search-entity-types";
import type {
  SearchSuggestionGroups,
  SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

function entityToItem(entity: SearchEntity): SearchSuggestionItem {
  const secondary =
    entity.entityType === "year"
      ? "RV History"
      : entity.artist?.trim() || null;

  const label =
    entity.entityType === "album" && entity.artist
      ? `${entity.label} · ${entity.artist}`
      : entity.label;

  return {
    id: `${entity.entityType}-${entity.rvId ?? entity.slug}`,
    kind:
      entity.entityType === "track"
        ? "song"
        : entity.entityType === "year"
          ? "year"
          : entity.entityType,
    title: entity.label,
    artist: secondary,
    year: entity.year,
    coverUrl: entity.coverUrl,
    label,
    href: entity.href,
    routeQuery: entity.slug,
    rvId: entity.rvId,
  };
}

export function entitiesToSuggestionGroups(
  entities: SearchEntity[],
): SearchSuggestionGroups {
  const groups: SearchSuggestionGroups = {
    artists: [],
    songs: [],
    albums: [],
    years: [],
  };

  for (const entity of entities) {
    const item = entityToItem(entity);
    if (entity.entityType === "artist") groups.artists.push(item);
    else if (entity.entityType === "track") groups.songs.push(item);
    else if (entity.entityType === "album") groups.albums.push(item);
    else if (entity.entityType === "year") groups.years.push(item);
  }

  return groups;
}
