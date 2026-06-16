import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { normRvtrId } from "./mission-safe";

export type AppearanceKind = "tv" | "movie";

export type MissionAppearanceRecord = {
  kind: AppearanceKind;
  candidateId: string;
  label: string;
  detail: string | null;
  status: "confirmed" | "rejected";
  updatedAt: string;
};

export type MissionAppearancesStoreFile = {
  version: 1;
  tracks: Record<string, MissionAppearanceRecord[]>;
  updatedAt: string;
};

function storePath(): string {
  return join(opsStateDir(), "atlas-mission-appearances-by-rvtr.json");
}

function emptyStore(): MissionAppearancesStoreFile {
  const now = new Date().toISOString();
  return { version: 1, tracks: {}, updatedAt: now };
}

export async function loadMissionAppearancesStore(): Promise<MissionAppearancesStoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<MissionAppearancesStoreFile>;
    if (parsed.version !== 1 || !parsed.tracks || typeof parsed.tracks !== "object") {
      return emptyStore();
    }
    return {
      version: 1,
      tracks: parsed.tracks,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyStore();
  }
}

export function appearanceConfirmed(
  store: MissionAppearancesStoreFile,
  rvtr: string,
  kind: AppearanceKind,
): MissionAppearanceRecord | null {
  const id = normRvtrId(rvtr);
  if (!id) return null;
  const row = store.tracks[id]?.find((r) => r.kind === kind && r.status === "confirmed");
  return row ?? null;
}

export function appearanceRejectedIds(
  store: MissionAppearancesStoreFile,
  rvtr: string,
  kind: AppearanceKind,
): Set<string> {
  const id = normRvtrId(rvtr);
  if (!id) return new Set();
  const rows = store.tracks[id]?.filter((r) => r.kind === kind && r.status === "rejected") ?? [];
  return new Set(rows.map((r) => r.candidateId));
}

export async function saveMissionAppearance(input: {
  rvtr: string;
  kind: AppearanceKind;
  candidateId: string;
  label: string;
  detail?: string | null;
  status: "confirmed" | "rejected";
}): Promise<MissionAppearancesStoreFile> {
  const id = normRvtrId(input.rvtr);
  if (!id) throw new Error("Valid RVTR required");

  const store = await loadMissionAppearancesStore();
  const now = new Date().toISOString();
  const existing = store.tracks[id] ?? [];
  const withoutKind = existing.filter((r) => r.kind !== input.kind);
  const nextRow: MissionAppearanceRecord = {
    kind: input.kind,
    candidateId: input.candidateId,
    label: input.label,
    detail: input.detail ?? null,
    status: input.status,
    updatedAt: now,
  };

  const tracks = {
    ...store.tracks,
    [id]: [...withoutKind, nextRow],
  };

  const next: MissionAppearancesStoreFile = { version: 1, tracks, updatedAt: now };
  await mkdir(opsStateDir(), { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
