import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

export type SongDnaCollectorHints = {
  recordingStudio: string | null;
  productionNotes: string[];
  vocalNotes: string[];
  instrumentHints: string[];
  legacyNotes: string[];
};

function factTexts(collector: CollectorPackage | null): string[] {
  if (!collector) return [];
  return (collector.candidateFacts ?? []).map((f) => f.text ?? "").filter(Boolean);
}

export function extractCollectorHints(
  collector: CollectorPackage | null,
  dna: CollectorSongDna,
): SongDnaCollectorHints {
  const texts = factTexts(collector);
  const combined = texts.join(" ");

  const recordingStudio =
    combined.match(/Muscle Shoals|recorded at [^.]+/i)?.[0] ??
    collector?.recording?.notes?.[0] ??
    null;

  const productionNotes = texts.filter((t) =>
    /studio|recorded|producer|tape|analog|digital|mix/i.test(t),
  );

  const vocalNotes = texts.filter((t) =>
    /vocal|harmony|sung|hook|choir|lead singer/i.test(t),
  );

  const instrumentHints: string[] = [];
  if (dna.musical?.instrumentalness.label === "Vocal-led") {
    instrumentHints.push("Vocal-led arrangement — instruments support the voice");
  }
  if (dna.musical?.acousticness.label) {
    instrumentHints.push(`${dna.musical.acousticness.label} acoustic character`);
  }
  if (/guitar|piano|drums|organ|horn|bass/i.test(combined)) {
    for (const t of texts) {
      if (/guitar|piano|drums|organ|horn|bass/i.test(t)) instrumentHints.push(t.slice(0, 100));
    }
  }

  const legacyNotes = [
    dna.story.culturalImportance,
    dna.story.historicalImportance,
    dna.story.discoveryValue,
  ].filter(Boolean);

  return {
    recordingStudio,
    productionNotes: productionNotes.slice(0, 3),
    vocalNotes: vocalNotes.slice(0, 3),
    instrumentHints: instrumentHints.slice(0, 4),
    legacyNotes,
  };
}
