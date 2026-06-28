import type { WikipediaCapture } from "@/lib/ops/intelligence/research-capture";
import {
  captureLyricsFromWikipedia,
  extractLyricsFromWikipediaExcerpt,
  type LyricsCaptureResult,
} from "@/lib/ops/intelligence/lyrics-capture";

import type { CollectorLyricsArtifact } from "./types";

function toArtifact(result: LyricsCaptureResult): CollectorLyricsArtifact {
  if (!result.available) return { available: false };
  return { ...result };
}

/** Resolve lyrics from existing Wikipedia song capture — non-blocking research artifact. */
export async function buildCollectorLyricsArtifact(
  wikiCaptures: WikipediaCapture[],
): Promise<CollectorLyricsArtifact> {
  const songCapture = wikiCaptures.find((c) => c.id.startsWith("wiki-song-"));
  if (!songCapture) return { available: false };

  try {
    const fromSection = await captureLyricsFromWikipedia({
      pageTitle: songCapture.title,
      pageUrl: songCapture.url || undefined,
    });
    if (fromSection.available) return toArtifact(fromSection);

    const fromExcerpt = extractLyricsFromWikipediaExcerpt(songCapture.excerpt);
    if (fromExcerpt?.available) return toArtifact(fromExcerpt);
  } catch {
    return { available: false };
  }

  return { available: false };
}
