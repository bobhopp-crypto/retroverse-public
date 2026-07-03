/**
 * Sprint 3.33 — scoring helpers for Creative Review.
 */

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return clampScore(nums.reduce((a, b) => a + b, 0) / nums.length);
}

const TEXT_TEMPLATES = new Set(["story", "quote", "fact_stack"]);
const IMAGE_TEMPLATES = new Set(["gallery", "hero", "performance"]);

export function isTextHeavy(templateId: string): boolean {
  return TEXT_TEMPLATES.has(templateId);
}

export function isImageHeavy(templateId: string, hasMedia: boolean): boolean {
  return IMAGE_TEMPLATES.has(templateId) || (templateId === "gallery" && hasMedia);
}

export function densityScore(copyLength: number): number {
  if (copyLength === 0) return 35;
  if (copyLength < 40) return 55;
  if (copyLength <= 180) return 88;
  if (copyLength <= 320) return 72;
  return 48;
}

export function attentionFromDensity(density: number, templateId: string): number {
  let base = density;
  if (templateId === "performance" || templateId === "chart") base += 12;
  if (templateId === "hero") base += 8;
  if (templateId === "timeline") base += 4;
  return clampScore(base);
}

export function transitionScore(
  prevTemplate: string | null,
  currTemplate: string,
  prevStory: string | null,
  currStory: string,
): number {
  if (!prevTemplate) return 90;
  let score = 82;
  if (prevTemplate === currTemplate) score -= 18;
  if (prevStory === currStory) score -= 10;
  if (prevTemplate === "story" && currTemplate === "gallery") score += 8;
  if (prevTemplate === "story" && currTemplate === "chart") score += 10;
  if (prevTemplate === "gallery" && currTemplate === "quote") score += 6;
  return clampScore(score);
}

export function gateFromScore(
  overall: number,
  blockers: string[],
): { gate: import("./types").CreativeReviewPublishGate; label: string } {
  if (blockers.length > 0) {
    return { gate: "blocked", label: "Blocked — resolve blockers before publishing" };
  }
  if (overall >= 85) {
    return { gate: "ready", label: "Ready to publish" };
  }
  if (overall >= 72) {
    return { gate: "ready_with_changes", label: "Ready after minor revisions" };
  }
  if (overall >= 55) {
    return { gate: "needs_revision", label: "Needs revision — pacing or repetition issues" };
  }
  return { gate: "blocked", label: "Blocked — experience not yet enjoyable" };
}
