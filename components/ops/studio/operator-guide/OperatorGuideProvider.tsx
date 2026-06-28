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

const STORAGE_KEY = "retroverse-studio-operator-guide";

type OperatorGuideContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
  tourPage: string | null;
  startTour: (pageId: string) => void;
  endTour: () => void;
};

const OperatorGuideContext = createContext<OperatorGuideContextValue | null>(null);

export function OperatorGuideProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [tourPage, setTourPage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setEnabledState(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const startTour = useCallback((pageId: string) => {
    setTourPage(pageId);
    setEnabled(true);
  }, [setEnabled]);

  const endTour = useCallback(() => {
    setTourPage(null);
  }, []);

  const value = useMemo(
    () => ({ enabled: hydrated ? enabled : false, setEnabled, toggle, tourPage, startTour, endTour }),
    [enabled, endTour, hydrated, setEnabled, startTour, toggle, tourPage],
  );

  return <OperatorGuideContext.Provider value={value}>{children}</OperatorGuideContext.Provider>;
}

export function useOperatorGuide(): OperatorGuideContextValue {
  const ctx = useContext(OperatorGuideContext);
  if (!ctx) {
    throw new Error("useOperatorGuide must be used within OperatorGuideProvider");
  }
  return ctx;
}

export function useOperatorGuideOptional(): OperatorGuideContextValue | null {
  return useContext(OperatorGuideContext);
}
