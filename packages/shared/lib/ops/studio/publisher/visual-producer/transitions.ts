/**
 * Sprint 3.37 — Transition design between produced scenes.
 */

import type { DirectorArtDirectionBrief } from "@/lib/ops/studio/director/storytelling/types";

import type { ProducerLayoutType, ProducedSceneTransition } from "./types";
import { rhythmFamily } from "./select-layout";

const MOTION_TRANSITION: Record<string, { in: string; out: string }> = {
  Zoom: { in: "fade_up", out: "fade" },
  Fade: { in: "fade", out: "fade" },
  "Slow pan": { in: "slide_left", out: "fade" },
  "Timeline growth": { in: "draw_line", out: "hold" },
  "Map travel": { in: "pin_drop", out: "cross_dissolve" },
  "Photo scatter": { in: "scatter_in", out: "cross_dissolve" },
  "Record spin": { in: "spin_in", out: "fade" },
  Pulse: { in: "pulse_in", out: "fade" },
  "Cross dissolve": { in: "cross_dissolve", out: "cross_dissolve" },
};

export function designTransition(
  artBrief: DirectorArtDirectionBrief | undefined,
  layout: ProducerLayoutType,
  prevFamily: string | null,
  emotionalTone: string | undefined,
): ProducedSceneTransition {
  const motion = artBrief?.motion ?? "Fade";
  const base = MOTION_TRANSITION[motion] ?? { in: "fade", out: "fade" };
  const family = rhythmFamily(layout);

  let continuityNote = "Standard editorial beat";
  if (prevFamily && prevFamily === family) {
    continuityNote = `Contrast shift — previous ${prevFamily} beat gives way to ${layout.replace(/_/g, " ")}`;
  } else if (emotionalTone === "Suspense" || emotionalTone === "Wonder") {
    continuityNote = "Emotional lift — pacing opens breathing room";
  } else if (emotionalTone === "Excitement" || emotionalTone === "Celebration") {
    continuityNote = "Energy carry — momentum continues across the cut";
  } else if (emotionalTone === "Reflection" || emotionalTone === "Hope") {
    continuityNote = "Reflective dissolve — slower visual cadence";
  }

  return {
    transitionIn: base.in,
    transitionOut: base.out,
    continuityNote,
  };
}
