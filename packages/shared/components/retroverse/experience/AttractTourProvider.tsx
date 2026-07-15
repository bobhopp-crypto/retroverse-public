"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ATTRACT_INACTIVITY_RESUME_MS,
  attractSongDurationSec,
  buildDirectorAttractBeatSchedule,
  type AttractBeat,
} from "@/lib/retroverse/experience/attract-timeline";
import type { AttractTourEntry } from "@/lib/retroverse/experience/attract-tour-pool";
import type { ExperienceChapterKind } from "@/lib/retroverse/experience/experience-types";

export type AttractTourMode = "attract" | "living" | "paused";

export type AttractActiveTheme = {
  title: string;
  description: string;
};

type AttractTourContextValue = {
  mode: AttractTourMode;
  activeBeat: AttractBeat;
  songElapsedSec: number;
  songDurationSec: number;
  liveActive: boolean;
  engaged: boolean;
  activeTheme: AttractActiveTheme | null;
  registerInteraction: () => void;
};

const AttractTourContext = createContext<AttractTourContextValue | null>(null);

const SEED_KEY = "retroverse-attract-seed";
const SONG_INDEX_KEY = "retroverse-attract-song-index";
const LEGACY_THEME_INDEX_KEY = "retroverse-attract-theme-index";

/** Session cache — full pool survives song-to-song navigations without refetch churn. */
let cachedAttractPoolEntries: AttractTourEntry[] | null = null;

type ProviderProps = {
  rvtr: string;
  storyScore: number;
  openingKind?: ExperienceChapterKind;
  children: ReactNode;
};

function readSessionNumber(key: string): number {
  try {
    const raw = sessionStorage.getItem(key);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeSessionNumber(key: string, index: number): void {
  try {
    sessionStorage.setItem(key, String(index));
  } catch {
    /* ignore */
  }
}

function readOrCreateSeed(): number {
  try {
    const existing = sessionStorage.getItem(SEED_KEY);
    if (existing) {
      const n = Number(existing);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const seed = Math.floor(Math.random() * 1_000_000_000);
    sessionStorage.setItem(SEED_KEY, String(seed));
    return seed;
  } catch {
    return Math.floor(Math.random() * 1_000_000_000);
  }
}

export function AttractTourProvider({
  rvtr,
  storyScore,
  openingKind = "story",
  children,
}: ProviderProps) {
  const rvtrUpper = rvtr.toUpperCase();

  const [mode, setMode] = useState<AttractTourMode>("attract");
  const [engaged, setEngaged] = useState(false);
  const [liveActive, setLiveActive] = useState(false);
  const [liveRvtr, setLiveRvtr] = useState<string | null>(null);
  const [songElapsedSec, setSongElapsedSec] = useState(0);
  const [activeTheme, setActiveTheme] = useState<AttractActiveTheme | null>(null);

  const allPoolRef = useRef<AttractTourEntry[]>([]);
  const tourSongsRef = useRef<AttractTourEntry[]>([]);
  const songIndexRef = useRef(readSessionNumber(SONG_INDEX_KEY));
  const seedRef = useRef(readOrCreateSeed());
  const engagedRef = useRef(engaged);
  const liveActiveRef = useRef(liveActive);
  const inactivityTimerRef = useRef<number | null>(null);
  const liveEndTimerRef = useRef<number | null>(null);
  const attractTickRef = useRef<number | null>(null);
  const songStartedAtRef = useRef(Date.now());

  const songDurationSec = attractSongDurationSec(storyScore);
  const beatSchedule = useMemo(
    () => buildDirectorAttractBeatSchedule(songDurationSec, openingKind),
    [songDurationSec, openingKind],
  );

  engagedRef.current = engaged;
  liveActiveRef.current = liveActive;

  const applyFullPool = useCallback((entries: AttractTourEntry[]) => {
    cachedAttractPoolEntries = entries;
    allPoolRef.current = entries;
    tourSongsRef.current = entries;
    setActiveTheme(null);
    try {
      sessionStorage.removeItem(LEGACY_THEME_INDEX_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const syncSongIndexForRvtr = useCallback((targetRvtr: string) => {
    const currentIdx = tourSongsRef.current.findIndex(
      (entry) => entry.rvtr.toUpperCase() === targetRvtr.toUpperCase(),
    );
    if (currentIdx >= 0) {
      songIndexRef.current = currentIdx;
      writeSessionNumber(SONG_INDEX_KEY, currentIdx);
    }
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current != null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const scheduleInactivityResume = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      if (liveActiveRef.current) return;
      engagedRef.current = false;
      setEngaged(false);
      setMode("attract");
      songStartedAtRef.current = Date.now();
      setSongElapsedSec(0);
    }, ATTRACT_INACTIVITY_RESUME_MS);
  }, [clearInactivityTimer]);

  const registerInteraction = useCallback(() => {
    engagedRef.current = true;
    setEngaged(true);
    setMode("living");
    scheduleInactivityResume();
  }, [scheduleInactivityResume]);

  const advanceToNextSong = useCallback(() => {
    const tour = tourSongsRef.current;
    if (tour.length === 0) return;

    let nextSongIndex = songIndexRef.current + 1;
    if (nextSongIndex >= tour.length) {
      nextSongIndex = 0;
    }

    songIndexRef.current = nextSongIndex;
    writeSessionNumber(SONG_INDEX_KEY, nextSongIndex);

    songStartedAtRef.current = Date.now();
    setSongElapsedSec(0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const seed = seedRef.current;

    async function loadPool() {
      if (cachedAttractPoolEntries && cachedAttractPoolEntries.length > 0) {
        applyFullPool(cachedAttractPoolEntries);
        syncSongIndexForRvtr(rvtrUpper);
        return;
      }

      try {
        const res = await fetch(`/api/retroverse-2/attract-tour?seed=${seed}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { entries?: AttractTourEntry[] };
        if (cancelled || !Array.isArray(data.entries) || data.entries.length === 0) return;
        applyFullPool(data.entries);
        syncSongIndexForRvtr(rvtrUpper);
      } catch {
        /* tour continues on current song */
      }
    }

    void loadPool();
    return () => {
      cancelled = true;
    };
  }, [applyFullPool, syncSongIndexForRvtr, rvtrUpper]);

  useEffect(() => {
    if (mode !== "attract" || engaged || liveActive) {
      if (attractTickRef.current != null) {
        window.clearInterval(attractTickRef.current);
        attractTickRef.current = null;
      }
      return;
    }

    songStartedAtRef.current = Date.now();
    attractTickRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - songStartedAtRef.current) / 1000;
      setSongElapsedSec(elapsed);
      if (elapsed >= songDurationSec) {
        advanceToNextSong();
      }
    }, 200);

    return () => {
      if (attractTickRef.current != null) {
        window.clearInterval(attractTickRef.current);
        attractTickRef.current = null;
      }
    };
  }, [mode, engaged, liveActive, songDurationSec, advanceToNextSong]);

  useEffect(() => {
    const onInteract = () => registerInteraction();

    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("touchstart", onInteract, { passive: true });
    window.addEventListener("wheel", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract);

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("wheel", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [registerInteraction]);

  useEffect(
    () => () => {
      clearInactivityTimer();
      if (liveEndTimerRef.current != null) window.clearTimeout(liveEndTimerRef.current);
    },
    [clearInactivityTimer],
  );

  let activeBeat: AttractBeat = "hero";
  for (const slot of beatSchedule) {
    if (songElapsedSec + 0.05 >= slot.atSec) activeBeat = slot.beat;
  }

  const value = useMemo(
    () => ({
      mode: liveActive ? "living" : mode,
      activeBeat,
      songElapsedSec,
      songDurationSec,
      liveActive,
      engaged,
      activeTheme,
      registerInteraction,
    }),
    [
      mode,
      activeBeat,
      songElapsedSec,
      songDurationSec,
      liveActive,
      engaged,
      activeTheme,
      registerInteraction,
    ],
  );

  return (
    <AttractTourContext.Provider value={value}>
      <div
        className="rv-attract-root"
        data-tour-mode={value.mode}
        data-live={liveActive ? "true" : "false"}
        data-live-rvtr={liveRvtr ?? undefined}
        data-tour-theme={activeTheme?.title}
      >
        {children}
      </div>
    </AttractTourContext.Provider>
  );
}

export function useAttractTour(): AttractTourContextValue {
  const ctx = useContext(AttractTourContext);
  if (!ctx) {
    return {
      mode: "living",
      activeBeat: "hero",
      songElapsedSec: 0,
      songDurationSec: 10,
      liveActive: false,
      engaged: true,
      activeTheme: null,
      registerInteraction: () => {},
    };
  }
  return ctx;
}
