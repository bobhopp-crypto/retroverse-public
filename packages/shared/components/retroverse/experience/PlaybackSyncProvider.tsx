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

export function PlaybackSyncProvider({ rvtr, durationSec, children }: ProviderProps) {
  const [state, setState] = useState<PlaybackSyncState>({
    ...DEFAULT_STATE,
    durationSec,
  });
  const localActiveRef = useRef(false);

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
