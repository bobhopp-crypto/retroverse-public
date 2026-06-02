import { randomUUID } from "crypto";

import type { SourceCandidate, SourceType } from "./types";

function encodeQuery(q: string): string {
  return encodeURIComponent(q.replace(/\s+/g, " ").trim());
}

function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeQuery(query)}`;
}

function internetArchiveSearchUrl(query: string): string {
  return `https://archive.org/search?query=${encodeQuery(query)}`;
}

type Template = { title: string; querySuffix: string };

function templatesFor(
  year: number,
  recommendationTitle: string,
  sourceType: SourceType,
): Template[] {
  const base = `${year} ${recommendationTitle}`;
  if (sourceType === "youtube") {
    return [
      { title: `${year} ${recommendationTitle}`, querySuffix: "" },
      { title: `${recommendationTitle} (${year})`, querySuffix: "original" },
      { title: `${recommendationTitle} — period footage`, querySuffix: "archive footage" },
    ];
  }
  return [
    { title: `${year} ${recommendationTitle}`, querySuffix: "" },
    { title: `${year} commercial reel — ${recommendationTitle}`, querySuffix: "commercial" },
    { title: `${recommendationTitle} — broadcast archive`, querySuffix: "television" },
  ];
}

export function buildSourceCandidates(
  year: number,
  recommendationId: string,
  recommendationTitle: string,
): SourceCandidate[] {
  const now = new Date().toISOString();
  const types: SourceType[] = ["youtube", "internet_archive"];
  const out: SourceCandidate[] = [];

  for (const sourceType of types) {
    for (const tpl of templatesFor(year, recommendationTitle, sourceType)) {
      const query = tpl.querySuffix
        ? `${year} ${recommendationTitle} ${tpl.querySuffix}`
        : `${year} ${recommendationTitle}`;
      const url =
        sourceType === "youtube"
          ? youtubeSearchUrl(query)
          : internetArchiveSearchUrl(query);

      out.push({
        id: `src-${randomUUID()}`,
        recommendationId,
        title: tpl.title,
        sourceType,
        query,
        url,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return out;
}
