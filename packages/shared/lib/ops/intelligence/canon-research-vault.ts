import type { SongPackageMetadata } from "./song-package-types";

import {
  buildChartResearchEntry,
  buildVdjResearchEntry,
  type WikipediaCapture,
} from "./research-capture";

/** Build Retroverse canon research vault entries — always before external sources. */
export function buildCanonResearchCaptures(metadata: SongPackageMetadata): WikipediaCapture[] {
  const captures: WikipediaCapture[] = [];

  captures.push({
    id: "retroverse-identity",
    source: "Retroverse Canon",
    url: "",
    title: `${metadata.title} — ${metadata.rvtr}`,
    excerpt: [
      `Retroverse track identity: ${metadata.rvtr}.`,
      `"${metadata.title}" by ${metadata.artist}.`,
      metadata.albumTitle
        ? `Album: ${metadata.albumTitle}${metadata.year ? ` (${metadata.year})` : ""}.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    confidence: 1,
  });

  if (metadata.coverUrl) {
    captures.push({
      id: "retroverse-cover",
      source: "Retroverse Cover Library",
      url: metadata.coverUrl,
      title: `${metadata.albumTitle ?? metadata.title} — cover`,
      excerpt: `Canonical cover assignment for ${metadata.rvtr} (${metadata.title}). Cover URL is graph-owned and must not be replaced by external research.`,
      confidence: 1,
    });
  }

  const chartCapture = buildChartResearchEntry(metadata);
  if (chartCapture) captures.push(chartCapture);

  const vdjCapture = buildVdjResearchEntry(metadata);
  if (vdjCapture) captures.push(vdjCapture);

  if (metadata.tags.length > 0) {
    captures.push({
      id: "retroverse-tags",
      source: "Retroverse Tags",
      url: "",
      title: `${metadata.title} — tags`,
      excerpt: `Canonical Retroverse Tags for ${metadata.rvtr}: ${metadata.tags.join(", ")}. Tags are RVTR-owned; VirtualDJ User2 is downstream only.`,
      confidence: 1,
    });
  }

  if (metadata.year != null) {
    const yearBits = [`Performance year context: ${metadata.year}.`];
    if (metadata.relatedArtists?.length) {
      yearBits.push(`Related artists in graph: ${metadata.relatedArtists.join(", ")}.`);
    }
    captures.push({
      id: "retroverse-year-workspace",
      source: "Retroverse Year Workspace",
      url: "",
      title: `${metadata.year} — workspace context`,
      excerpt: yearBits.join(" "),
      confidence: 0.98,
    });
  } else if (metadata.relatedArtists?.length) {
    captures.push({
      id: "retroverse-artists",
      source: "Retroverse Graph",
      url: "",
      title: `${metadata.artist} — relationships`,
      excerpt: `Related artists in Retroverse graph: ${metadata.relatedArtists.join(", ")}.`,
      confidence: 0.95,
    });
  }

  return captures;
}
