import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import type { CollectorCardContent } from "@/lib/ops/content-creator/collector-card";
import { opsStateDir } from "@/lib/ops/ops-state-path";

export type CollectorDeckLockedYear = {
  year: number;
  lockedAt: string;
  sourceName: "Retroverse Hot 100";
  cards: CollectorCardContent[];
};

export type CollectorDeckStateFile = {
  version: 1;
  eraDeck: "1974-1977";
  lockedYears: Record<string, CollectorDeckLockedYear>;
  updatedAt: string;
};

function statePath(): string {
  return join(opsStateDir(), "content-creator", "collector-deck.json");
}

function emptyState(): CollectorDeckStateFile {
  return {
    version: 1,
    eraDeck: "1974-1977",
    lockedYears: {},
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCards(cards: CollectorCardContent[], year: number): CollectorCardContent[] {
  return cards.slice(0, 10).map((card, index) => ({
    year,
    song: card.song,
    artist: card.artist,
    rvtr: card.rvtr,
    chartPosition: card.chartPosition ?? index + 1,
    peak: card.peak ?? null,
    weeks: card.weeks ?? null,
    fact: card.fact,
  }));
}

export async function loadCollectorDeckState(): Promise<CollectorDeckStateFile> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CollectorDeckStateFile>;
    if (parsed.version !== 1 || parsed.eraDeck !== "1974-1977") return emptyState();
    return {
      version: 1,
      eraDeck: "1974-1977",
      lockedYears: parsed.lockedYears ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyState();
  }
}

export async function saveCollectorDeckState(state: CollectorDeckStateFile): Promise<void> {
  await mkdir(join(opsStateDir(), "content-creator"), { recursive: true });
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function lockCollectorDeckYear(args: {
  year: number;
  cards: CollectorCardContent[];
}): Promise<CollectorDeckLockedYear> {
  const state = await loadCollectorDeckState();
  const locked: CollectorDeckLockedYear = {
    year: args.year,
    lockedAt: new Date().toISOString(),
    sourceName: "Retroverse Hot 100",
    cards: normalizeCards(args.cards, args.year),
  };
  state.lockedYears[String(args.year)] = locked;
  state.updatedAt = locked.lockedAt;
  await saveCollectorDeckState(state);
  return locked;
}
