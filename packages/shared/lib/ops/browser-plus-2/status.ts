import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

import type { Bp2IdentityStatus, Bp2Row } from "./types";

export function deriveIdentityStatus(row: BrowserPlusRow): Bp2IdentityStatus {
  if (!row.rvtr) return "Unidentified";
  if (row.label.startsWith("DK_")) return "Processed Legacy";
  if (row.label.startsWith("PK_")) return "Processed";
  return "Identified";
}

export function isActiveVideoRow(row: BrowserPlusRow): boolean {
  if (!row.isVideo) return false;
  const path = row.filePath.replace(/\\/g, "/");
  if (/\/MUSIC\//i.test(path)) return false;
  if (/\/VIDEO VAULT\//i.test(path)) return false;
  return /\/VIDEO\//i.test(path);
}

export {
  BP2_WORK_QUEUE_FILTERS as BP2_FILTERS,
  matchesWorkQueueFilter as matchesBp2Filter,
  sortForWorkQueueFilter as sortForFilter,
  workQueueFilterCounts as filterCounts,
} from "./work-queues";

export type { Bp2WorkQueueId } from "./work-queues";
