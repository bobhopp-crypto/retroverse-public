"use client";

import type { OperatorFeedbackStore } from "@/lib/retroverse/experience-design/types";

const PREFIX = "retroverse-design-feedback:";

export function loadOperatorFeedback(rvtr: string): OperatorFeedbackStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${PREFIX}${rvtr}`);
    return raw ? (JSON.parse(raw) as OperatorFeedbackStore) : {};
  } catch {
    return {};
  }
}

export function saveOperatorFeedback(rvtr: string, store: OperatorFeedbackStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}${rvtr}`, JSON.stringify(store));
}

export function toggleOperatorFeedback(
  rvtr: string,
  current: OperatorFeedbackStore,
  id: keyof OperatorFeedbackStore,
): OperatorFeedbackStore {
  const next = { ...current, [id]: !current[id] };
  if (!next[id]) delete next[id];
  saveOperatorFeedback(rvtr, next);
  return next;
}
