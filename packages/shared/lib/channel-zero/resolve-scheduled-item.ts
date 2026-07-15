import {
  TOP_10_SONGS_1969_EPOCH_MS,
  TOP_10_SONGS_1969_ITEM_MS,
  TOP_10_SONGS_1969_PROGRAM_ID,
  TOP_10_SONGS_1969_RVTRS,
  type Top10Songs1969Item,
} from "./programs/top-10-songs-1969";

/** Current Top 10 Songs of 1969 slot from server time (loops forever). */
export function resolveTop10Songs1969Item(nowMs: number): Top10Songs1969Item {
  const count = TOP_10_SONGS_1969_RVTRS.length;
  const slotIndex = Math.floor((nowMs - TOP_10_SONGS_1969_EPOCH_MS) / TOP_10_SONGS_1969_ITEM_MS);
  const itemIndex = ((slotIndex % count) + count) % count;
  const slotStartMs = TOP_10_SONGS_1969_EPOCH_MS + slotIndex * TOP_10_SONGS_1969_ITEM_MS;
  const slotEndMs = slotStartMs + TOP_10_SONGS_1969_ITEM_MS;

  return {
    programId: TOP_10_SONGS_1969_PROGRAM_ID,
    itemIndex,
    rvtr: TOP_10_SONGS_1969_RVTRS[itemIndex]!,
    slotStartMs,
    slotEndMs,
  };
}
