import type { SortingBoardFile, SortingBucket } from "./types";

export function emptyBucketOrder(buckets: SortingBucket[]): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const b of buckets) order[b.id] = [];
  return order;
}

/** Keep bucketOrder aligned with assignments; append unknown keys at end. */
export function syncBucketOrder(file: SortingBoardFile): void {
  const bucketIds = new Set(file.buckets.map((b) => b.id));
  if (!file.bucketOrder || typeof file.bucketOrder !== "object") {
    file.bucketOrder = emptyBucketOrder(file.buckets);
  }

  for (const b of file.buckets) {
    if (!Array.isArray(file.bucketOrder[b.id])) file.bucketOrder[b.id] = [];
  }

  for (const id of Object.keys(file.bucketOrder)) {
    if (!bucketIds.has(id)) delete file.bucketOrder[id];
  }

  const keysByBucket = new Map<string, string[]>();
  for (const b of file.buckets) keysByBucket.set(b.id, []);

  for (const [key, bucketId] of Object.entries(file.assignments)) {
    const list = keysByBucket.get(bucketId);
    if (list) list.push(key);
  }

  for (const b of file.buckets) {
    const assigned = new Set(keysByBucket.get(b.id) ?? []);
    const prev = file.bucketOrder[b.id] ?? [];
    const next = prev.filter((k) => assigned.has(k));
    for (const k of assigned) {
      if (!next.includes(k)) next.push(k);
    }
    file.bucketOrder[b.id] = next;
  }
}

export function insertIntoBucketOrder(
  order: string[],
  workspaceKey: string,
  insertBefore: string | null,
): string[] {
  const next = order.filter((k) => k !== workspaceKey);
  if (insertBefore && next.includes(insertBefore)) {
    const idx = next.indexOf(insertBefore);
    next.splice(idx, 0, workspaceKey);
  } else {
    next.push(workspaceKey);
  }
  return next;
}

export function removeFromAllBucketOrders(
  bucketOrder: Record<string, string[]>,
  workspaceKey: string,
): void {
  for (const id of Object.keys(bucketOrder)) {
    bucketOrder[id] = bucketOrder[id].filter((k) => k !== workspaceKey);
  }
}
