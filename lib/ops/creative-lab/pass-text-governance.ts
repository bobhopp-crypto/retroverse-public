import {
  COMPOSITION_LABEL_DISCLAIMER,
  DEBUG_LEAK_PREVENTION_PROMPT,
  NO_INVENTED_TEXT_PROMPT,
} from "./pass-prompt-safety";

export const CONTROLLED_PASS_TYPE_LABELS = ["VIP PASS", "PASS", "EVENT PASS"] as const;

export type ControlledPassTypeLabel = (typeof CONTROLLED_PASS_TYPE_LABELS)[number];

export function normalizePassTypeLabel(raw: string | undefined | null): ControlledPassTypeLabel {
  const upper = (raw ?? "").trim().toUpperCase();
  if (upper === "PASS" || upper === "EVENT PASS") return upper;
  return "VIP PASS";
}

export type PassTextFields = {
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
  passTypeLabel: ControlledPassTypeLabel;
};

function displayUrl(qrUrl?: string): string | null {
  if (!qrUrl?.trim()) return null;
  try {
    return new URL(qrUrl.trim()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Corpus of strings allowed to appear as readable text on the pass. */
export function buildAllowedTextCorpus(fields: PassTextFields, qrUrl?: string): string[] {
  const out: string[] = [];
  if (fields.passTypeLabel.trim()) out.push(fields.passTypeLabel);
  if (fields.event.trim()) out.push(fields.event.trim());
  if (fields.venue.trim()) out.push(fields.venue.trim());
  if (fields.date.trim()) out.push(fields.date.trim());
  if (fields.secondaryLine.trim()) out.push(fields.secondaryLine.trim());
  const host = displayUrl(qrUrl);
  if (host) out.push(host);
  return out;
}

/** Compressed governed text — exact strings only, no venue narrative. */
export function compressedTextGovernancePromptBlock(fields: PassTextFields): string {
  const allowed: string[] = [];
  if (fields.passTypeLabel.trim()) allowed.push(`Pass type: ${fields.passTypeLabel}`);
  if (fields.event.trim()) allowed.push(`Event: ${fields.event.trim()}`);
  if (fields.venue.trim()) allowed.push(`Venue: ${fields.venue.trim()}`);
  if (fields.date.trim()) allowed.push(`Date: ${fields.date.trim()}`);
  if (fields.secondaryLine.trim()) allowed.push(`Secondary line: ${fields.secondaryLine.trim()}`);

  return [
    `GOVERNED TEXT — use ONLY these exact strings, no invented words:`,
    ...(allowed.length ? allowed.map((line) => `- ${line}`) : ["- (none — decoration only)"]),
    `Empty fields = no text for that field. No serial numbers in artwork.`,
    `Venue is text only. Never treat venue as subject matter; do not draw venue buildings, facades, or architecture.`,
  ].join("\n");
}

/** Retroverse controls words; AI controls artwork only. */
export function textGovernancePromptBlock(fields: PassTextFields, _qrUrl?: string): string {
  const allowed: string[] = [];
  if (fields.passTypeLabel.trim()) allowed.push(`Pass type (exact): ${fields.passTypeLabel}`);
  if (fields.event.trim()) allowed.push(`Event (exact): ${fields.event.trim()}`);
  if (fields.venue.trim()) allowed.push(`Venue (exact): ${fields.venue.trim()}`);
  if (fields.date.trim()) allowed.push(`Date (exact): ${fields.date.trim()}`);
  if (fields.secondaryLine.trim()) {
    allowed.push(`Secondary line (exact): ${fields.secondaryLine.trim()}`);
  }

  return [
    NO_INVENTED_TEXT_PROMPT,
    ``,
    DEBUG_LEAK_PREVENTION_PROMPT,
    ``,
    COMPOSITION_LABEL_DISCLAIMER,
    ``,
    `TEXT GOVERNANCE — RETROVERSE CONTROLS ALL WORDS ON THIS PASS:`,
    allowed.length
      ? `Allowed text strings (use ONLY these, exactly as written):`
      : `No text fields supplied — use NO readable typography on this pass. Decoration only.`,
    ...allowed.map((line) => `- ${line}`),
    ``,
    `Empty field rule: if a field is not listed above, do NOT render any text for it.`,
    `Venue rule: venue name is governed text only — typographic treatment in bands, stamps, or captions. Never illustrate buildings, facades, or venue architecture.`,
    `Illustration, borders, color, and ornamentation are AI-controlled.`,
    `Typography content is Retroverse-controlled — no extra labels, slogans, or credentials.`,
  ].join("\n");
}
