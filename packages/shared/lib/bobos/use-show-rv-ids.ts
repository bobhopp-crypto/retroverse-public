"use client";

import { useCallback, useEffect, useState } from "react";

import { RV_ID_STORAGE_KEY } from "@/lib/bobos/rv-ids";

const CHANGE_EVENT = "bobos:showRvIds-changed";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(RV_ID_STORAGE_KEY) === "1";
}

export function useShowRvIds(): readonly [boolean, (next: boolean) => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(readStored());
    const onChange = () => setShow(readStored());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const setShowRvIds = useCallback((next: boolean) => {
    localStorage.setItem(RV_ID_STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setShow(next);
  }, []);

  return [show, setShowRvIds] as const;
}
