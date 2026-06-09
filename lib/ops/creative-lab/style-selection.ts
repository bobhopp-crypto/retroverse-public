import type { StyleCategory, StyleSelection, WeightedStyle } from "./types";

/** Map legacy illustration ids to current catalog ids. */
const LEGACY_STYLE_IDS: Record<string, string> = {
  cartoon: "saturday-morning-cartoon",
  "saturday-morning": "saturday-morning-cartoon",
};

export function resolveStyleId(id: string): string {
  return LEGACY_STYLE_IDS[id] ?? id;
}

export function getWeight(selection: StyleSelection, category: StyleCategory, id: string): number {
  const resolved = resolveStyleId(id);
  const row = selection[category].find((w) => resolveStyleId(w.id) === resolved);
  return row?.weight ?? 0;
}

export function isStyleSelected(selection: StyleSelection, category: StyleCategory, id: string): boolean {
  return getWeight(selection, category, id) > 0;
}

/** Evenly distribute 100% across selected ids. */
export function autoWeightSelected(ids: string[]): WeightedStyle[] {
  if (ids.length === 0) return [];
  const base = Math.floor(100 / ids.length);
  let remainder = 100 - base * ids.length;
  return ids.map((id) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { id, weight: base + extra };
  });
}

export function toggleStyleSelection(
  selection: StyleSelection,
  category: StyleCategory,
  id: string,
): StyleSelection {
  const resolved = resolveStyleId(id);
  const currentIds = selection[category]
    .filter((w) => w.weight > 0)
    .map((w) => resolveStyleId(w.id))
    .filter((sid, idx, arr) => arr.indexOf(sid) === idx);

  const isOn = currentIds.includes(resolved);
  const nextIds = isOn ? currentIds.filter((sid) => sid !== resolved) : [...currentIds, resolved];
  return { ...selection, [category]: autoWeightSelected(nextIds) };
}

export function setManualWeight(
  selection: StyleSelection,
  category: StyleCategory,
  id: string,
  weight: number,
): StyleSelection {
  const resolved = resolveStyleId(id);
  const others = selection[category].filter((w) => resolveStyleId(w.id) !== resolved);
  const clamped = Math.max(0, Math.min(100, weight));
  const next = clamped > 0 ? [...others, { id: resolved, weight: clamped }] : others;
  return { ...selection, [category]: next.sort((a, b) => b.weight - a.weight) };
}

export function selectionHasWeights(selection: StyleSelection): boolean {
  return (
    selection.credential.length > 0 ||
    selection.illustration.length > 0 ||
    selection.color.length > 0 ||
    selection.density.length > 0
  );
}

export function weightedStylesSummary(selection: StyleSelection): string {
  const parts: string[] = [];
  for (const cat of ["credential", "illustration", "color", "density"] as const) {
    const top = selection[cat][0];
    if (top) parts.push(`${top.weight}% ${top.id}`);
  }
  return parts.join(" · ") || "No styles selected";
}
