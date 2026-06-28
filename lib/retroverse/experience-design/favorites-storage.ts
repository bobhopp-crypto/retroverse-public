"use client";

import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

const PREFIX = "retroverse-derived-favorites:";

export function loadDerivedFavorites(rvtr: string): VisualStyleId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${rvtr}`);
    return raw ? (JSON.parse(raw) as VisualStyleId[]) : [];
  } catch {
    return [];
  }
}

export function saveDerivedFavorites(rvtr: string, ids: VisualStyleId[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}${rvtr}`, JSON.stringify(ids));
}

export function toggleDerivedFavorite(rvtr: string, current: VisualStyleId[], id: VisualStyleId): VisualStyleId[] {
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  saveDerivedFavorites(rvtr, next);
  return next;
}
