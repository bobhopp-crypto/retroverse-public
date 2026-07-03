"use client";

import type { ReactNode } from "react";

import { searchQueryTokens } from "@/lib/search/normalize-search-label";

/** Subtle substring emphasis for overlay trust (first matching token). */
export function highlightMatchText(text: string, query: string): ReactNode {
  const safe = typeof text === "string" ? text : String(text ?? "");
  const tokens = searchQueryTokens(query)
    .filter((t) => t.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (!tokens.length) return safe;

  const lower = safe.toLowerCase();
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx < 0) continue;
    return (
      <>
        {safe.slice(0, idx)}
        <mark className="home-search-suggestions__mark">
          {safe.slice(idx, idx + token.length)}
        </mark>
        {safe.slice(idx + token.length)}
      </>
    );
  }
  return safe;
}
