import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import { pgSundayNightsGet, pgSundayNightsSet } from "@/lib/sunday-nights/pg-state";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

import type { BroadcastSnapshot } from "./types";

/**
 * Broadcast Snapshot storage.
 *
 * Local studio: JSON next to the presentation store
 *   (RETROVERSE_DATA/ops/bobos/presentation/broadcast.json).
 * Deployed site (Vercel): Postgres key in sunday_nights_state, written by
 *   the authenticated ingest route when the Broadcast Panel pushes.
 *
 * Both sites answer "what is the current Playhead?" from this snapshot.
 */

const PG_KEY = "retroverse-live-broadcast";

function snapshotPath(): string {
  return join(opsStateDir(), "bobos", "presentation", "broadcast.json");
}

export function normalizeBroadcastSnapshot(raw: unknown): BroadcastSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<BroadcastSnapshot>;
  if (
    typeof obj.presentationId !== "string" ||
    typeof obj.title !== "string" ||
    !obj.queue ||
    !Array.isArray(obj.queue.items) ||
    !obj.playhead ||
    typeof obj.playhead !== "object"
  ) {
    return null;
  }
  return {
    version: 1,
    presentationId: obj.presentationId,
    title: obj.title,
    queue: { items: obj.queue.items, loop: obj.queue.loop !== false },
    playhead: obj.playhead,
    publishedAt: typeof obj.publishedAt === "string" ? obj.publishedAt : new Date().toISOString(),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
    autoFollowVdj: obj.autoFollowVdj !== false,
    manualTakeActive: obj.manualTakeActive === true,
  };
}

export async function loadBroadcastSnapshot(): Promise<BroadcastSnapshot | null> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<Record<string, unknown>>(PG_KEY);
    return normalizeBroadcastSnapshot(raw);
  }
  try {
    const raw = await readFile(snapshotPath(), "utf8");
    return normalizeBroadcastSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveBroadcastSnapshot(snapshot: BroadcastSnapshot): Promise<void> {
  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(PG_KEY, snapshot as unknown as Record<string, unknown>);
    return;
  }
  const dir = join(opsStateDir(), "bobos", "presentation");
  await mkdir(dir, { recursive: true });
  await writeFile(snapshotPath(), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}
