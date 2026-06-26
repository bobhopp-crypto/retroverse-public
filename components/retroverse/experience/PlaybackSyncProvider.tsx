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

export type PlaybackSyncState = {
  /** Whether we have an active sync source (local player or live deck). */
  synced: boolean;
  playing: boolean;
  currentTimeSec: number;
  durationSec: number;
  source: "idle" | "local" | "live";
};

type PlaybackSyncContextValue = PlaybackSyncState & {
  reportLocalPlayback: (update: Partial<PlaybackSyncState> & { currentTimeSec: number }) => void;
};

const DEFAULT_STATE: PlaybackSyncState = {
  synced: false,
  playing: false,
  currentTimeSec: 0,
  durationSec: 240,
  source: "idle",
};

const PlaybackSyncContext = createContext<PlaybackSyncContextValue | null>(null);

type ProviderProps = {
  rvtr: string;
  durationSec: number;
  children: ReactNode;
};

const LIVE_POLL_MS = 1500;

export function PlaybackSyncProvider({ rvtr, durationSec, children }: ProviderProps) {
  const [state, setState] = useState<PlaybackSyncState>({
    ...DEFAULT_STATE,
    durationSec,
  });
  const localActiveRef = useRef(false);
  const liveAnchorRef = useRef<{ trackId: string; startedAtMs: number } | null>(null);

  const reportLocalPlayback = useCallback(
    (update: Partial<PlaybackSyncState> & { currentTimeSec: number }) => {
      localActiveRef.current = update.playing ?? true;
      setState((prev) => ({
        synced: true,
        playing: update.playing ?? prev.playing,
        currentTimeSec: Math.max(0, update.currentTimeSec),
        durationSec: update.durationSec && update.durationSec > 0 ? update.durationSec : prev.durationSec,
        source: "local",
      }));
    },
    [],
  );

  useEffect(() => {
    setState((prev) => ({ ...prev, durationSec }));
  }, [durationSec]);

  useEffect(() => {
    let cancelled = false;
    const rvtrUpper = rvtr.toUpperCase();

    async function pollLive() {
      if (localActiveRef.current) return;
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          currentTrackId?: string | null;
          updatedAt?: string;
          live?: { bridgeTimestamp?: string | null; source?: string | null } | null;
          channel?: { running?: boolean } | null;
        };

        const liveRvtr = data.currentTrackId?.trim().toUpperCase();
        if (!liveRvtr || liveRvtr !== rvtrUpper) {
          liveAnchorRef.current = null;
          if (!localActiveRef.current) {
            setState((prev) =>
              prev.source === "live"
                ? { ...prev, synced: false, playing: false, source: "idle", currentTimeSec: 0 }
                : prev,
            );
          }
          return;
        }

        const anchorIso = data.live?.bridgeTimestamp ?? data.updatedAt;
        const anchorMs = anchorIso ? Date.parse(anchorIso) : NaN;
        if (!Number.isFinite(anchorMs)) return;

        if (
          !liveAnchorRef.current ||
          liveAnchorRef.current.trackId !== liveRvtr
        ) {
          liveAnchorRef.current = { trackId: liveRvtr, startedAtMs: anchorMs };
        }

        const elapsedSec = Math.max(0, (Date.now() - liveAnchorRef.current.startedAtMs) / 1000);
        setState((prev) => ({
          synced: true,
          playing: Boolean(data.channel?.running ?? true),
          currentTimeSec: elapsedSec,
          durationSec: prev.durationSec,
          source: "live",
        }));
      } catch {
        /* keep last sync state */
      }
    }

    const id = window.setInterval(pollLive, LIVE_POLL_MS);
    pollLive();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [rvtr]);

  const value = useMemo(
    () => ({
      ...state,
      reportLocalPlayback,
    }),
    [state, reportLocalPlayback],
  );

  return <PlaybackSyncContext.Provider value={value}>{children}</PlaybackSyncContext.Provider>;
}

export function usePlaybackSync(): PlaybackSyncContextValue {
  const ctx = useContext(PlaybackSyncContext);
  if (!ctx) {
    return {
      ...DEFAULT_STATE,
      reportLocalPlayback: () => {},
    };
  }
  return ctx;
}
