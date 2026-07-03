import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

import type { SongDnaChapter, SongDnaProductionReadiness } from "./types";

/** Publisher integration readiness — local assessment only; does not modify Publisher. */
export function assessProductionReadiness(input: {
  dna: CollectorSongDna;
  chapters: SongDnaChapter[];
  coverUrl: string | null;
}): SongDnaProductionReadiness {
  const { dna, chapters, coverUrl } = input;
  const checks = [
    {
      id: "song_dna_package",
      label: "Song DNA package",
      passed: Boolean(dna.musical || dna.visual),
      note: dna.musical ? "Musical profile present" : "Musical profile missing",
    },
    {
      id: "experience_chapters",
      label: "Experience chapters",
      passed: chapters.length >= 6,
      note: `${chapters.length} active chapters`,
    },
    {
      id: "visual_identity",
      label: "Visual identity",
      passed: Boolean(dna.visual?.dominantPalette.length),
      note: dna.visual ? "Palette from artwork" : "No visual DNA",
    },
    {
      id: "cover_art",
      label: "Cover artwork",
      passed: Boolean(coverUrl),
      note: coverUrl ? "Cover available for exhibit" : "Cover missing",
    },
    {
      id: "identity_chapter",
      label: "Identity chapter",
      passed: chapters.some((c) => c.id === "identity"),
      note: "Opening fingerprint beat",
    },
    {
      id: "legacy_chapter",
      label: "Legacy chapter",
      passed: chapters.some((c) => c.id === "legacy"),
      note: "Closing meaning beat",
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const passed = score >= 75;

  return {
    score,
    passed,
    checks,
    publisherNotes: [
      "Visual Producer layout: museum_dna (when Director includes song_dna story)",
      "Publisher dimension: experienceQuality + assetCoverage reference song_dna artifact",
      "Patron path: applyVisualProductionToScenes overlays presentation — Song DNA chapter content TBD at publish",
      passed ? "Ready for Publisher evaluation when patron route opens" : "Complete missing checks before publish gate",
    ],
  };
}
