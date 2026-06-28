/**
 * Sprint 3.32 — strip private ops metadata from public-facing page copy.
 */

const DJ_METADATA =
  /virtualdj|play count|detected year|curated visual|rvtr\d{6}|cover library/i;
const FILE_PATH = /(?:\/|\b)[\w.-]+\.(mp4|m4v|mp3|jpg|jpeg|png|webp)\b/i;
const ABS_PATH = /\/Users\/[^\s]+/i;
const TRUNCATED_SONG =
  /^"When You'?re in Love with a Beautiful Woman" is a song by Dr\.?$/i;

export function sanitizePublicCopy(text: string): string {
  if (!text) return "";
  let t = text.trim();
  if (DJ_METADATA.test(t)) {
    t = t
      .replace(/VirtualDJ play count:?\s*\d+/gi, "")
      .replace(/Detected year:?\s*\d+\.?\s*/gi, "")
      .replace(/Curated visual[^.]*\.?\s*/gi, "")
      .replace(/Canonical cover art is assigned in the Retroverse Cover Library for RVTR\d+\.?/gi, "")
      .trim();
  }
  if (FILE_PATH.test(t)) t = t.replace(FILE_PATH, "").trim();
  if (ABS_PATH.test(t)) t = t.replace(ABS_PATH, "").trim();
  if (TRUNCATED_SONG.test(t)) return "";
  if (/^\d+\.\s/.test(t) && /\)\s*[–-]\s*\d{1,2}:\d{2}/.test(t)) return "";
  if (/^\d+\.\s/.test(t) && t.length < 50) return "";
  if (/\)\s*[–-]\s*\d{1,2}:\d{2}\s*$/.test(t) && t.length < 90) return "";
  t = t.replace(/\s{2,}/g, " ").trim();
  if (t.length < 20) return "";
  return t;
}

export function normalizeFactKey(text: string): string {
  return sanitizePublicCopy(text).slice(0, 100).toLowerCase();
}

export function headlineFromCopy(text: string, fallback: string): string {
  const clean = sanitizePublicCopy(text);
  if (!clean) return fallback;
  if (/muscle shoals/i.test(clean)) return "Muscle Shoals";
  if (/bathroom|pitch/i.test(clean)) return "The bathroom pitch";
  if (/written by even stevens/i.test(clean)) return "Even Stevens wrote it";
  if (/hot 100|billboard/i.test(clean)) return "Chart climb";
  if (/uk|number one in the uk/i.test(clean)) return "UK breakthrough";
  if (/pleasure \+ pain|pleasure and pain/i.test(clean)) return "Album context";
  if (/seventh album|country rock/i.test(clean)) return "Dr. Hook at the time";
  const sentence = clean.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? clean;
  if (sentence.length <= 56) return sentence.replace(/\.$/, "");
  return `${sentence.slice(0, 53).trim()}…`;
}

export function audienceLabelForPage(
  page: { storyId: string; headline: string; supportingCopy: string; templateId: string; exhibitId: string },
  exhibitTitle: string,
): string {
  if (page.storyId === "hero") return "Hero";
  if (page.storyId === "introduction") return "Why this song matters";
  if (page.templateId === "chart") return "Chart climb";
  if (page.storyId === "song_dna") return "Song DNA";
  if (page.storyId === "legacy" && page.templateId === "timeline") return "Legacy timeline";
  const copy = `${page.headline} ${page.supportingCopy}`;
  if (/bathroom|pitch/i.test(copy)) return "The bathroom pitch";
  if (/muscle shoals/i.test(copy)) return "Muscle Shoals";
  if (/uk|international|number one/i.test(copy)) return "UK breakthrough";
  if (/1981|performance|video/i.test(copy) && page.storyId === "performance_history") {
    return page.headline.includes("1981") ? "1981 performance" : page.headline;
  }
  if (page.headline && page.headline !== "Cultural Impact" && page.headline !== "Recording") {
    return page.headline;
  }
  return exhibitTitle || page.headline;
}
