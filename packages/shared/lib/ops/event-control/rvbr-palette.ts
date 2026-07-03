/** RVBR issue color tokens — hero accents only (from Retroverse brand palette). */

import type { RvbrIssueColor } from "./types";

export type RvbrIssuePalette = {
  accent: string;
  accentHot: string;
  border: string;
  bgStart: string;
  bgEnd: string;
};

export const RVBR_ISSUE_PALETTES: Record<RvbrIssueColor, RvbrIssuePalette> = {
  DEFAULT: {
    accent: "#1f5e63",
    accentHot: "#d4693f",
    border: "rgba(31, 94, 99, 0.42)",
    bgStart: "rgba(111, 168, 161, 0.18)",
    bgEnd: "#f0e6d2",
  },
  "1960s": {
    accent: "#0d6e7a",
    accentHot: "#f4c430",
    border: "rgba(13, 110, 122, 0.45)",
    bgStart: "rgba(244, 196, 48, 0.14)",
    bgEnd: "#faf4e8",
  },
  "1970s": {
    accent: "#b8860b",
    accentHot: "#d44f1a",
    border: "rgba(184, 134, 11, 0.45)",
    bgStart: "rgba(212, 79, 26, 0.1)",
    bgEnd: "#f6eedc",
  },
  "1980s": {
    accent: "#5c2d82",
    accentHot: "#e85d2a",
    border: "rgba(92, 45, 130, 0.42)",
    bgStart: "rgba(232, 93, 42, 0.12)",
    bgEnd: "#f3ead8",
  },
  "1990s": {
    accent: "#9b4d3a",
    accentHot: "#5c2d82",
    border: "rgba(155, 77, 58, 0.42)",
    bgStart: "rgba(92, 45, 130, 0.1)",
    bgEnd: "#efe4cf",
  },
  "2000s": {
    accent: "#6e7c8f",
    accentHot: "#0d6e7a",
    border: "rgba(110, 124, 143, 0.42)",
    bgStart: "rgba(13, 110, 122, 0.12)",
    bgEnd: "#ebe6da",
  },
};

export const RVBR_ISSUE_COLOR_OPTIONS: { id: RvbrIssueColor; label: string }[] = [
  { id: "DEFAULT", label: "Default" },
  { id: "1960s", label: "1960s" },
  { id: "1970s", label: "1970s" },
  { id: "1980s", label: "1980s" },
  { id: "1990s", label: "1990s" },
  { id: "2000s", label: "2000s" },
];

export function normalizeIssueColor(raw: unknown): RvbrIssueColor {
  if (
    raw === "DEFAULT" ||
    raw === "1960s" ||
    raw === "1970s" ||
    raw === "1980s" ||
    raw === "1990s" ||
    raw === "2000s"
  ) {
    return raw;
  }
  return "DEFAULT";
}

export function issueColorClass(color: RvbrIssueColor): string {
  if (color === "DEFAULT") return "home-directory__hero-card--rvbr-default";
  return `home-directory__hero-card--rvbr-${color}`;
}

export function issuePalette(color: RvbrIssueColor): RvbrIssuePalette {
  return RVBR_ISSUE_PALETTES[color];
}
