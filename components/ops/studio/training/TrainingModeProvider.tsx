"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { TrainingDepartmentId } from "@/lib/ops/studio/training/types";

const TRAINING_MODE_KEY = "retroverse-studio-training-mode";
const TRAINING_RVTR_KEY = "retroverse-studio-training-rvtr";

type TrainingModeContextValue = {
  trainingMode: boolean;
  setTrainingMode: (value: boolean) => void;
  toggleTrainingMode: () => void;
  activeRvtr: string | null;
  setActiveRvtr: (rvtr: string | null) => void;
  trainingPath: (department: TrainingDepartmentId) => string | null;
};

const TrainingModeContext = createContext<TrainingModeContextValue | null>(null);

export function TrainingModeProvider({ children }: { children: ReactNode }) {
  const [trainingMode, setTrainingModeState] = useState(false);
  const [activeRvtr, setActiveRvtrState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(TRAINING_MODE_KEY) === "1") setTrainingModeState(true);
      const rvtr = localStorage.getItem(TRAINING_RVTR_KEY);
      if (rvtr?.trim()) setActiveRvtrState(rvtr.trim().toUpperCase());
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setTrainingMode = useCallback((value: boolean) => {
    setTrainingModeState(value);
    try {
      localStorage.setItem(TRAINING_MODE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTrainingMode = useCallback(() => {
    setTrainingModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TRAINING_MODE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setActiveRvtr = useCallback((rvtr: string | null) => {
    const normalized = rvtr?.trim().toUpperCase() || null;
    setActiveRvtrState(normalized);
    try {
      if (normalized) localStorage.setItem(TRAINING_RVTR_KEY, normalized);
      else localStorage.removeItem(TRAINING_RVTR_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const trainingPath = useCallback(
    (department: TrainingDepartmentId) => {
      if (!activeRvtr) return null;
      return `/ops/studio/training/${activeRvtr}/${department}`;
    },
    [activeRvtr],
  );

  const value = useMemo(
    () => ({
      trainingMode: hydrated ? trainingMode : false,
      setTrainingMode,
      toggleTrainingMode,
      activeRvtr: hydrated ? activeRvtr : null,
      setActiveRvtr,
      trainingPath,
    }),
    [
      activeRvtr,
      hydrated,
      setActiveRvtr,
      setTrainingMode,
      toggleTrainingMode,
      trainingMode,
      trainingPath,
    ],
  );

  return <TrainingModeContext.Provider value={value}>{children}</TrainingModeContext.Provider>;
}

export function useTrainingMode(): TrainingModeContextValue {
  const ctx = useContext(TrainingModeContext);
  if (!ctx) throw new Error("useTrainingMode must be used within TrainingModeProvider");
  return ctx;
}

export function useTrainingModeOptional(): TrainingModeContextValue | null {
  return useContext(TrainingModeContext);
}
