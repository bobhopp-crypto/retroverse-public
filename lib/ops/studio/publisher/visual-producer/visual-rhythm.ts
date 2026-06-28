/**
 * Sprint 3.37 — Visual rhythm enforcement across produced scenes.
 */

import type { ProducedScene } from "./types";
import { rhythmFamily } from "./select-layout";

export type RhythmAudit = {
  overallRhythm: string;
  warnings: string[];
  families: string[];
};

export function auditVisualRhythm(scenes: ProducedScene[]): RhythmAudit {
  const warnings: string[] = [];
  const families = scenes.map((s) => s.rhythm.family);
  let run = 1;

  for (let i = 1; i < families.length; i++) {
    if (families[i] === families[i - 1]) {
      run += 1;
      if (run >= 3) {
        warnings.push(
          `Three consecutive ${families[i]} beats (scenes ${i - 1}–${i + 1}) — visual fatigue risk`,
        );
        run = 1;
      }
    } else {
      run = 1;
    }
  }

  const weights = scenes.map((s) => s.rhythm.visualWeight);
  const heavyRun = weights.filter((w, i, arr) => w === "heavy" && arr[i - 1] === "heavy").length;
  if (heavyRun >= 2) {
    warnings.push("Back-to-back heavy visual weight — insert a light breathing beat");
  }

  const sequence = families.slice(0, 8).join(" → ");
  return {
    overallRhythm: sequence + (families.length > 8 ? " → …" : ""),
    warnings,
    families,
  };
}

export function visualWeightForLayout(layout: ProducedScene["layout"]): ProducedScene["rhythm"]["visualWeight"] {
  if (layout === "hero" || layout === "performance_reel" || layout === "timeline") return "heavy";
  if (layout === "documentary_frame" || layout === "magazine_spread") return "light";
  return "medium";
}

export function pacingBeat(
  index: number,
  total: number,
  emotionalTone: string,
): string {
  if (index === 0) return "Opening — establish world";
  if (index === total - 1) return "Closing — leave a lasting impression";
  if (emotionalTone === "Excitement" || emotionalTone === "Celebration") return "Peak energy beat";
  if (emotionalTone === "Reflection" || emotionalTone === "Hope") return "Reflective interlude";
  if (emotionalTone === "Suspense" || emotionalTone === "Curiosity") return "Narrative tension beat";
  return "Mid-journey discovery";
}
