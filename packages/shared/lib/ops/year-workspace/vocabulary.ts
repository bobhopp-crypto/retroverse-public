/** Fixed performance-keyword vocabulary for Year Workspace pilots. */
export const YEAR_WORKSPACE_KEYWORDS = [
  "Crowd Favorite",
  "Singalong",
  "Feel Good",
  "Story Song",
  "Soul Essential",
  "Psychedelic",
  "Dance Floor",
  "Slow Dance",
  "Party Starter",
  "Late Night",
  "Conversation Piece",
  "Forgotten Gem",
  "Personal Favorite",
  "Visual Showcase",
  "Time Capsule",
] as const;

export type YearWorkspaceKeyword = (typeof YEAR_WORKSPACE_KEYWORDS)[number];

const KEYWORD_SET = new Set<string>(YEAR_WORKSPACE_KEYWORDS);

export function isYearWorkspaceKeyword(value: string): value is YearWorkspaceKeyword {
  return KEYWORD_SET.has(value);
}

export function normalizeYearWorkspaceKeywords(values: string[]): YearWorkspaceKeyword[] {
  const out: YearWorkspaceKeyword[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = raw.trim();
    if (!isYearWorkspaceKeyword(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
