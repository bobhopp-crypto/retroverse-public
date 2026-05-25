import { searchQueryTokens } from "@/lib/search/normalize-search-label";

/** Subtle substring emphasis for overlay trust (first matching token). */
export function highlightMatchText(text: string, query: string): React.ReactNode {
  const tokens = searchQueryTokens(query)
    .filter((t) => t.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (!tokens.length) return text;

  const lower = text.toLowerCase();
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx < 0) continue;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="home-search-suggestions__mark">
          {text.slice(idx, idx + token.length)}
        </mark>
        {text.slice(idx + token.length)}
      </>
    );
  }
  return text;
}
