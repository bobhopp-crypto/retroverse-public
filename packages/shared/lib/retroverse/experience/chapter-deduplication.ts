import type { TrackPageData } from "@/lib/track/load-track-page";

import type { ExperienceChapter } from "./experience-types";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((token) => token.length > 3),
  );
}

function overlapRatio(a: string, b: string): number {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / Math.min(left.size, right.size);
}

function chapterText(chapter: ExperienceChapter): string {
  switch (chapter.kind) {
    case "story":
      return chapter.cards.map((card) => `${card.title ?? ""} ${card.body} ${card.context ?? ""}`).join(" ");
    case "timeline":
      return chapter.events.map((event) => `${event.title} ${event.description}`).join(" ");
    case "discover":
      return chapter.shelves.map((shelf) => shelf.title).join(" ");
    case "sources":
      return chapter.sections.flatMap((section) => section.entries.map((entry) => entry.preview)).join(" ");
    case "chart_journey":
      return chapter.summary ?? chapter.track.chartRunLabel;
  }
}

function isChartFactText(text: string): boolean {
  return /\b(chart|hot 100|billboard|peak|weeks on|re-?entry|debut)\b/i.test(text);
}

function isRecordingFactText(text: string): boolean {
  return /\b(record(ed|ing)?|studio|producer|session)\b/i.test(text);
}

function isAlbumFactText(text: string): boolean {
  return /\b(album|lp|track listing|b-side)\b/i.test(text);
}

function albumContextText(track: TrackPageData): string {
  const album = track.albums[0];
  if (!album) return "";
  return `${album.title} ${album.releaseYear ?? ""}`;
}

function repeatsKnownFact(body: string, seenTexts: string[], threshold = 0.42): boolean {
  return seenTexts.some((seen) => overlapRatio(seen, body) >= threshold);
}

/** Remove chapters that repeat facts already covered elsewhere. */
export function deduplicateExperienceChapters(
  chapters: ExperienceChapter[],
  options: {
    hasChartJourney: boolean;
    track: TrackPageData;
    chartSummary?: string | null;
  },
): ExperienceChapter[] {
  const { hasChartJourney, track, chartSummary } = options;
  const seenTexts: string[] = [];
  const seenRecording = { value: false };
  const seenAlbum = { value: false };
  const result: ExperienceChapter[] = [];

  if (chartSummary?.trim()) seenTexts.push(chartSummary);
  const albumContext = albumContextText(track);
  if (albumContext.trim()) seenTexts.push(albumContext);

  for (const chapter of chapters) {
    if (chapter.kind === "story") {
      if (hasChartJourney && /\bchart\b|on the charts/i.test(chapter.title)) continue;

      const body = chapterText(chapter);
      if (hasChartJourney && isChartFactText(body) && body.length < 360) continue;

      if (/from the album|album context/i.test(chapter.title)) {
        seenAlbum.value = true;
      } else if (seenAlbum.value && isAlbumFactText(body) && body.length < 320) {
        continue;
      }

      if (isRecordingFactText(body)) {
        if (seenRecording.value && body.length < 280) continue;
        seenRecording.value = true;
      }

      if (repeatsKnownFact(body, seenTexts)) continue;

      seenTexts.push(body);
      result.push(chapter);
      continue;
    }

    if (chapter.kind === "timeline") {
      if (hasChartJourney) continue;

      const events = chapter.events.filter((event) => {
        const text = `${event.title} ${event.description}`;
        if (isChartFactText(text)) return false;
        if (seenRecording.value && isRecordingFactText(text) && text.length < 120) return false;
        if (repeatsKnownFact(text, seenTexts, 0.45)) return false;
        return text.trim().length >= 24;
      });
      if (events.length === 0) continue;
      seenTexts.push(events.map((event) => `${event.title} ${event.description}`).join(" "));
      result.push({ ...chapter, events });
      continue;
    }

    if (chapter.kind === "discover") {
      const shelfKey = chapter.shelves.map((shelf) => shelf.id).join("+");
      if (seenTexts.includes(shelfKey)) continue;
      seenTexts.push(shelfKey);
      result.push(chapter);
      continue;
    }

    const text = chapterText(chapter);
    if (repeatsKnownFact(text, seenTexts, 0.45)) continue;
    seenTexts.push(text);
    result.push(chapter);
  }

  return result;
}
