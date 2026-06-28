"use client";

import type { LabLayoutId, LabRatingsStore } from "@/lib/retroverse/experience-lab/types";

const STORAGE_PREFIX = "retroverse-experience-lab-ratings:";

export function loadLabRatings(rvtr: string): LabRatingsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${rvtr}`);
    if (!raw) return {};
    return JSON.parse(raw) as LabRatingsStore;
  } catch {
    return {};
  }
}

export function saveLabRatings(rvtr: string, ratings: LabRatingsStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_PREFIX}${rvtr}`, JSON.stringify(ratings));
}
