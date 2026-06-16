import { assessCompilationRisk } from "@/lib/healing/compilation-risk";

export type MbReleaseShape =
  | "studio"
  | "mixtape"
  | "ep"
  | "live"
  | "remix"
  | "compilation"
  | "soundtrack"
  | "session"
  | "deluxe";

const MIXTAPE_TITLE_RE =
  /\b(mixtape|street album|chixtape)\b|\bf\*?ck\s+love\b.*\bsavage\b/i;

export function detectReleaseShape(albumTitle: string): MbReleaseShape {
  const t = albumTitle.trim();
  if (MIXTAPE_TITLE_RE.test(t)) return "mixtape";
  if (/\bdeluxe\b/i.test(t)) return "deluxe";
  if (/\blive\b/i.test(t)) return "live";
  if (/\bremix\b/i.test(t)) return "remix";
  const risk = assessCompilationRisk(t, "");
  if (risk.level === "high") {
    if (risk.signals.includes("soundtrack")) return "soundtrack";
    return "compilation";
  }
  if (risk.level === "low") return "compilation";
  return "studio";
}

export function isMixtapeRelease(albumTitle: string, manualOverride = false): boolean {
  if (manualOverride) return false;
  return detectReleaseShape(albumTitle) === "mixtape";
}
