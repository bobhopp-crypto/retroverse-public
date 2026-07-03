import type { ProjectDomain, ProjectSharedContext, WorkspaceCatalogId } from "./types";

/**
 * Project Zero intent parser — an intentionally hard-coded mock, not AI classification.
 *
 * Reusing the existing Producer analyze() pipeline was considered and ruled out for this
 * sprint: it writes into Producer's own singleton state (`producer-state.json`) and its
 * output schema is event-specific, and this sprint must not touch Producer. This mock proves
 * the orchestration shell (prompt → Project → workspaces); a real classifier can replace it
 * later without changing anything downstream, since callers only see `ParsedIntent`.
 */

const EVENT_KEYWORDS = ["sunday", "event", "show", "night", "party", "gig", "concert"];
const SALE_KEYWORDS = ["sell", "selling", "sale", "listing", "marketplace"];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const DOMAIN_WORKSPACES: Record<ProjectDomain, WorkspaceCatalogId[]> = {
  event: ["passes", "poster", "public-experience", "giveaway"],
  sale: ["marketplace-listing", "finance-review"],
  general: ["general"],
};

function detectDomain(text: string): ProjectDomain {
  const lower = text.toLowerCase();
  if (SALE_KEYWORDS.some((keyword) => lower.includes(keyword))) return "sale";
  if (EVENT_KEYWORDS.some((keyword) => lower.includes(keyword))) return "event";
  return "general";
}

function findDate(text: string): string {
  const lower = text.toLowerCase();
  const month = MONTHS.find((m) => lower.includes(m));
  if (month) return month.charAt(0).toUpperCase() + month.slice(1);
  if (lower.includes("this weekend")) return "This weekend";
  if (lower.includes("tonight")) return "Tonight";
  return "";
}

function deriveTitle(prompt: string): string {
  const cleaned = prompt
    .trim()
    .replace(/^i'?m\s+/i, "")
    .replace(/^i\s+am\s+/i, "")
    .replace(/^i\s+need\s+/i, "")
    .replace(/^i\s+want\s+to\s+/i, "")
    .replace(/[.!]+$/, "");
  const capped = cleaned.length > 48 ? `${cleaned.slice(0, 45).trim()}…` : cleaned;
  return capped ? capped.charAt(0).toUpperCase() + capped.slice(1) : "Untitled Project";
}

export type ParsedIntent = {
  domain: ProjectDomain;
  workspaceIds: WorkspaceCatalogId[];
  sharedContext: ProjectSharedContext;
};

export function parseProjectIntent(prompt: string): ParsedIntent {
  const domain = detectDomain(prompt);
  return {
    domain,
    workspaceIds: DOMAIN_WORKSPACES[domain],
    sharedContext: {
      title: deriveTitle(prompt),
      description: prompt.trim(),
      venue: "",
      date: findDate(prompt),
      series: "",
      theme: "",
      colors: "",
      notes: "",
    },
  };
}
