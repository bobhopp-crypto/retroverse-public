/** Strip internal Retroverse implementation language from patron-facing copy. */

const REPLACEMENTS: Array<{ pattern: RegExp; replace: string }> = [
  { pattern: /retroverse track identity:\s*RVTR\d{6}\.?/gi, replace: "" },
  { pattern: /\bRVTR\d{6}\b/g, replace: "" },
  { pattern: /canonical cover art is assigned[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /original album artwork is assigned[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /\btrack identity\b[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /\bcanonical cover library\b[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /\bexperience ready\b/gi, replace: "" },
  { pattern: /\bresearch vault\b/gi, replace: "" },
  { pattern: /\bintelligence package\b/gi, replace: "" },
  { pattern: /\bconnected in the graph\b/gi, replace: "" },
  { pattern: /\bgraph connections?\b/gi, replace: "" },
  { pattern: /\bRetroverse\b/g, replace: "" },
];

function tidyWhitespace(text: string): string {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[,.;:\-–—]\s*/, "")
    .trim();
}

export function sanitizePublicCopy(text: string): string {
  let out = text;
  for (const { pattern, replace } of REPLACEMENTS) {
    out = out.replace(pattern, replace);
  }
  return tidyWhitespace(out);
}

export function sanitizePublicCopyOrNull(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const cleaned = sanitizePublicCopy(text);
  return cleaned.length >= 12 ? cleaned : null;
}
