/** Client-side experience memory — per visitor, per song. */

const STORAGE_KEY = "retroverse-experience-memory";

export type SongMemory = {
  seenChapterIds: string[];
  visitCount: number;
  lastVisit: string;
  videoPlays: number;
};

export type ExperienceMemoryStore = {
  version: 1;
  songs: Record<string, SongMemory>;
};

function emptyStore(): ExperienceMemoryStore {
  return { version: 1, songs: {} };
}

export function loadExperienceMemory(): ExperienceMemoryStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as ExperienceMemoryStore;
    if (parsed.version !== 1 || !parsed.songs) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveExperienceMemory(store: ExperienceMemoryStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function getSongMemory(rvtr: string): SongMemory {
  const store = loadExperienceMemory();
  return (
    store.songs[rvtr.toUpperCase()] ?? {
      seenChapterIds: [],
      visitCount: 0,
      lastVisit: "",
      videoPlays: 0,
    }
  );
}

export function recordChapterSeen(rvtr: string, chapterId: string): void {
  const key = rvtr.toUpperCase();
  const store = loadExperienceMemory();
  const song = store.songs[key] ?? {
    seenChapterIds: [],
    visitCount: 0,
    lastVisit: "",
    videoPlays: 0,
  };
  if (!song.seenChapterIds.includes(chapterId)) {
    song.seenChapterIds.push(chapterId);
  }
  song.lastVisit = new Date().toISOString();
  store.songs[key] = song;
  saveExperienceMemory(store);
}

export function recordSongVisit(rvtr: string): SongMemory {
  const key = rvtr.toUpperCase();
  const store = loadExperienceMemory();
  const song = store.songs[key] ?? {
    seenChapterIds: [],
    visitCount: 0,
    lastVisit: "",
    videoPlays: 0,
  };
  song.visitCount += 1;
  song.lastVisit = new Date().toISOString();
  store.songs[key] = song;
  saveExperienceMemory(store);
  return song;
}

export function recordVideoPlay(rvtr: string): void {
  const key = rvtr.toUpperCase();
  const store = loadExperienceMemory();
  const song = store.songs[key] ?? {
    seenChapterIds: [],
    visitCount: 0,
    lastVisit: "",
    videoPlays: 0,
  };
  song.videoPlays += 1;
  store.songs[key] = song;
  saveExperienceMemory(store);
}

/** Re-score chapter ids the visitor already saw — deprioritize for opening. */
export function seenChapterIdsForRvtr(rvtr: string): string[] {
  return getSongMemory(rvtr).seenChapterIds;
}
