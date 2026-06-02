import type { ProducerTimelineState } from "./types";
import { computeShowRuntimeSeconds } from "./runtime";

export type ShowRuntimeHealth = {
  label: "ON TARGET" | "RUNNING SHORT" | "RUNNING LONG";
  tone: "ok" | "warn" | "bad";
  targetMinutes: number;
  currentMinutes: number;
  remainingMinutes: number;
  deltaMinutes: number;
};

export function showRuntimeHealth(
  state: ProducerTimelineState,
): ShowRuntimeHealth {
  const targetMinutes = state.targetRuntimeMinutes;
  const targetSeconds = targetMinutes * 60;
  const currentSeconds = computeShowRuntimeSeconds(state);
  const currentMinutes = currentSeconds / 60;
  const remainingSeconds = Math.max(0, targetSeconds - currentSeconds);
  const remainingMinutes = remainingSeconds / 60;
  const deltaMinutes = currentMinutes - targetMinutes;
  const absDelta = Math.abs(deltaMinutes);

  if (absDelta <= 5) {
    return {
      label: "ON TARGET",
      tone: "ok",
      targetMinutes,
      currentMinutes,
      remainingMinutes,
      deltaMinutes,
    };
  }
  if (absDelta <= 15) {
    return {
      label: deltaMinutes < 0 ? "RUNNING SHORT" : "RUNNING LONG",
      tone: "warn",
      targetMinutes,
      currentMinutes,
      remainingMinutes,
      deltaMinutes,
    };
  }
  return {
    label: deltaMinutes < 0 ? "RUNNING SHORT" : "RUNNING LONG",
    tone: "bad",
    targetMinutes,
    currentMinutes,
    remainingMinutes,
    deltaMinutes,
  };
}
