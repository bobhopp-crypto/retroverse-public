import type { SortingBoardPayload, SortingSong } from "./types";

export function normalizeSortingSong(raw: unknown): SortingSong | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<SortingSong>;
  const workspaceKey = typeof row.workspaceKey === "string" ? row.workspaceKey.trim() : "";
  if (!workspaceKey) return null;

  const playCount =
    typeof row.playCount === "number" && Number.isFinite(row.playCount) ? row.playCount : 0;

  let previewPath: string | null = null;
  if (typeof row.previewPath === "string" && row.previewPath.trim()) {
    previewPath = row.previewPath.trim();
  }

  return {
    workspaceKey,
    artist: typeof row.artist === "string" && row.artist.trim() ? row.artist : "Unknown artist",
    title: typeof row.title === "string" && row.title.trim() ? row.title : "Unknown title",
    playCount,
    previewPath,
  };
}

export function normalizeSortingBoardPayload(
  raw: unknown,
  fallbackYear: number,
): SortingBoardPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<SortingBoardPayload> & { ok?: boolean };
  if (row.ok !== true) return null;

  const year =
    typeof row.year === "number" && Number.isFinite(row.year) ? row.year : fallbackYear;

  const buckets = Array.isArray(row.buckets)
    ? row.buckets
        .map((b) => {
          if (!b || typeof b !== "object") return null;
          const bucket = b as { id?: unknown; name?: unknown; count?: unknown };
          const id = typeof bucket.id === "string" ? bucket.id.trim() : "";
          if (!id) return null;
          return {
            id,
            name: typeof bucket.name === "string" ? bucket.name : id,
            count:
              typeof bucket.count === "number" && Number.isFinite(bucket.count)
                ? bucket.count
                : 0,
          };
        })
        .filter((b): b is SortingBoardPayload["buckets"][number] => b != null)
    : [];

  const songs = Array.isArray(row.songs)
    ? row.songs
        .map(normalizeSortingSong)
        .filter((s): s is SortingSong => s != null)
    : [];

  const assignments =
    row.assignments && typeof row.assignments === "object" && !Array.isArray(row.assignments)
      ? Object.fromEntries(
          Object.entries(row.assignments).filter(
            ([key, value]) => key.trim() && typeof value === "string" && value.trim(),
          ),
        )
      : {};

  return { ok: true, year, buckets, songs, assignments };
}
