import { BUILTIN_PRESET_LIBRARY } from "@/lib/ops/creative-lab/preset-library";
import { styleById } from "@/lib/ops/creative-lab/style-catalog";
import { visualWorldById } from "@/lib/ops/creative-lab/visual-worlds";

import type { RvbrProfile } from "./types";

export type RvbrColorSwatch = {
  hex: string;
  label: string;
  source: string;
};

export type RvbrEditorialLine = {
  text: string;
  source: string;
};

export type RvbrEditorialSection = {
  id: string;
  title: string;
  lines: RvbrEditorialLine[];
  swatches?: RvbrColorSwatch[];
  emptyNote?: string;
};

export type RvbrGlance = {
  slug: string;
  name: string;
  years: string;
  accent: string | null;
  moodLine: string | null;
  hasVisualMapping: boolean;
};

export type RvbrPresentation = {
  headline: string;
  kicker: string;
  lede: string | null;
  sections: RvbrEditorialSection[];
  canonContext: RvbrEditorialLine[];
};

const CANON_NOISE = [
  "usage guidelines",
  "for collectible",
  "for magazine",
  "for playlists",
  "for navigation",
  "for visual identity",
  "for search",
  "for editorial",
  "for future ai",
  "maintenance notes",
  "this level will be developed",
];

function isNoisy(text: string): boolean {
  const lower = text.toLowerCase();
  return CANON_NOISE.some((n) => lower.includes(n));
}

function cleanLine(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed || isNoisy(trimmed)) return null;
  return trimmed;
}

function uniqueLines(lines: RvbrEditorialLine[]): RvbrEditorialLine[] {
  const seen = new Set<string>();
  const out: RvbrEditorialLine[] = [];
  for (const line of lines) {
    const key = line.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function sectionText(
  sections: Record<string, string> | undefined,
  key: string,
  sourceLabel: string,
): RvbrEditorialLine | null {
  const text = cleanLine(sections?.[key]);
  return text ? { text, source: sourceLabel } : null;
}

function chronologyMoodLines(chronology: Record<string, unknown>[] | undefined): RvbrEditorialLine[] {
  if (!Array.isArray(chronology)) return [];
  const lines: RvbrEditorialLine[] = [];
  for (const row of chronology) {
    const year = row.year;
    const mood =
      cleanLine(row["Emotional Atmosphere"]) ??
      cleanLine(row["Emotional atmosphere"]) ??
      cleanLine(row.emotionalAtmosphere);
    if (mood && year) {
      lines.push({ text: `${year}: ${mood}`, source: "canon.chronology" });
    }
  }
  return lines;
}

function resolvePresets(profile: RvbrProfile) {
  const ids = profile.promptFragments.creativeLabPresets ?? [];
  return ids
    .map((id) => BUILTIN_PRESET_LIBRARY.find((p) => p.id === id))
    .filter((p): p is (typeof BUILTIN_PRESET_LIBRARY)[number] => Boolean(p));
}

function resolveWorlds(profile: RvbrProfile) {
  const ids = profile.promptFragments.visualWorlds ?? [];
  return ids.map((id) => visualWorldById(id));
}

function buildMoodSection(profile: RvbrProfile): RvbrEditorialSection {
  const sections = profile.visualIdentity.sections;
  const lines = uniqueLines(
    [
      sectionText(sections, "culturalMood", "canon.culturalMood"),
      profile.visualIdentity.subtitle
        ? { text: profile.visualIdentity.subtitle, source: "canon.subtitle" }
        : null,
      profile.narrative
        ? {
            text: profile.narrative.split("\n\n")[0] ?? profile.narrative,
            source: "canon.summary",
          }
        : null,
      ...chronologyMoodLines(profile.visualIdentity.chronology),
    ].filter((l): l is RvbrEditorialLine => Boolean(l)),
  );

  return {
    id: "mood",
    title: "Mood",
    lines,
    emptyNote: lines.length ? undefined : "No mood narrative in canon for this era.",
  };
}

function buildColorsSection(profile: RvbrProfile): RvbrEditorialSection {
  const swatches: RvbrColorSwatch[] = [];
  const lines: RvbrEditorialLine[] = [];

  if (profile.visualIdentity.accent) {
    swatches.push({
      hex: profile.visualIdentity.accent,
      label: "Era accent",
      source: "canon.accent",
    });
  }

  for (const world of resolveWorlds(profile)) {
    for (const hex of world.palette) {
      swatches.push({
        hex,
        label: world.title,
        source: `visual-world.${world.id}`,
      });
    }
    lines.push({
      text: world.colorTreatment,
      source: `visual-world.${world.id}`,
    });
  }

  for (const preset of resolvePresets(profile)) {
    const color = styleById(preset.colorStyle);
    if (color) {
      lines.push({
        text: `${color.label} — ${color.description}`,
        source: `preset.${preset.id}.color`,
      });
    }
  }

  const dedupedSwatches = swatches.filter(
    (s, i, arr) => arr.findIndex((x) => x.hex.toLowerCase() === s.hex.toLowerCase()) === i,
  );

  return {
    id: "colors",
    title: "Colors",
    lines: uniqueLines(lines),
    swatches: dedupedSwatches,
    emptyNote:
      dedupedSwatches.length || lines.length
        ? undefined
        : "Accent and palette mapping not yet linked for this era.",
  };
}

function buildTypographySection(profile: RvbrProfile): RvbrEditorialSection {
  const lines: RvbrEditorialLine[] = [];

  for (const world of resolveWorlds(profile)) {
    lines.push({
      text: world.typographyStyle,
      source: `visual-world.${world.id}`,
    });
  }

  for (const preset of resolvePresets(profile)) {
    const credential = styleById(preset.credentialStyle);
    const illustration = styleById(preset.illustrationStyle);
    if (credential) {
      lines.push({
        text: `${credential.label} — ${credential.description}`,
        source: `preset.${preset.id}.credential`,
      });
    }
    if (illustration) {
      lines.push({
        text: `${illustration.label} — ${illustration.description}`,
        source: `preset.${preset.id}.illustration`,
      });
    }
  }

  return {
    id: "typography",
    title: "Typography",
    lines: uniqueLines(lines),
    emptyNote: lines.length ? undefined : "No Creative Lab typography mapping for this era yet.",
  };
}

function buildMotifsSection(profile: RvbrProfile): RvbrEditorialSection {
  const lines: RvbrEditorialLine[] = [];

  for (const world of resolveWorlds(profile)) {
    lines.push({
      text: world.borderStyle,
      source: `visual-world.${world.id}.border`,
    });
    lines.push({
      text: world.description,
      source: `visual-world.${world.id}`,
    });
  }

  for (const preset of resolvePresets(profile)) {
    const illustration = styleById(preset.illustrationStyle);
    const density = styleById(preset.densityStyle);
    if (illustration) {
      lines.push({
        text: illustration.description,
        source: `preset.${preset.id}.illustration`,
      });
    }
    if (density) {
      lines.push({
        text: `${density.label} layout — ${density.description}`,
        source: `preset.${preset.id}.density`,
      });
    }
  }

  return {
    id: "motifs",
    title: "Motifs",
    lines: uniqueLines(lines),
    emptyNote: lines.length ? undefined : "Border and illustration motifs not mapped for this era yet.",
  };
}

function buildArtifactsSection(profile: RvbrProfile): RvbrEditorialSection {
  const lines: RvbrEditorialLine[] = [];

  for (const preset of resolvePresets(profile)) {
    const credential = styleById(preset.credentialStyle);
    if (credential) {
      lines.push({
        text: `${credential.label} — ${credential.description}`,
        source: `preset.${preset.id}.credential`,
      });
    }
    lines.push({
      text: preset.description,
      source: `preset.${preset.id}`,
    });
  }

  const tech = sectionText(
    profile.visualIdentity.sections,
    "technologyMedia",
    "canon.technologyMedia",
  );
  if (tech) lines.push(tech);

  const chart = sectionText(profile.visualIdentity.sections, "chartBehavior", "canon.chartBehavior");
  if (chart) lines.push(chart);

  return {
    id: "artifacts",
    title: "Artifacts",
    lines: uniqueLines(lines),
    emptyNote: lines.length ? undefined : "No collectible forms or media artifacts documented yet.",
  };
}

function buildVisualReferencesSection(profile: RvbrProfile): RvbrEditorialSection {
  const lines: RvbrEditorialLine[] = [];

  for (const world of resolveWorlds(profile)) {
    for (const ref of world.visualReferences) {
      lines.push({ text: ref, source: `visual-world.${world.id}` });
    }
  }

  const artists = sectionText(
    profile.visualIdentity.sections,
    "definingArtists",
    "canon.definingArtists",
  );
  if (artists) lines.push(artists);

  const radio = sectionText(
    profile.visualIdentity.sections,
    "radioAtmosphere",
    "canon.radioAtmosphere",
  );
  if (radio) lines.push(radio);

  for (const album of profile.visualIdentity.definingAlbums ?? []) {
    const text = cleanLine(album);
    if (text) lines.push({ text, source: "canon.definingAlbums" });
  }

  for (const song of profile.visualIdentity.definingSongs ?? []) {
    const text = cleanLine(song);
    if (text) lines.push({ text, source: "canon.definingSongs" });
  }

  return {
    id: "visual-references",
    title: "Visual References",
    lines: uniqueLines(lines),
    emptyNote: lines.length ? undefined : "No visual reference anchors in canon for this era.",
  };
}

function buildCanonContext(profile: RvbrProfile): RvbrEditorialLine[] {
  const sections = profile.visualIdentity.sections;
  return uniqueLines(
    [
      sectionText(sections, "dominantGenres", "canon.dominantGenres"),
      sectionText(sections, "whatMakesItDistinct", "canon.whatMakesItDistinct"),
      sectionText(sections, "transitionFromPrevious", "canon.transitionFromPrevious"),
    ].filter((l): l is RvbrEditorialLine => Boolean(l)),
  );
}

export function buildRvbrPresentation(profile: RvbrProfile): RvbrPresentation {
  const summary = profile.narrative?.split("\n\n")[0] ?? null;
  return {
    headline: profile.name,
    kicker: `${profile.eraStartYear}–${profile.eraEndYear} · ${profile.retroverseEraId}`,
    lede: cleanLine(profile.visualIdentity.subtitle) ?? cleanLine(summary),
    sections: [
      buildMoodSection(profile),
      buildColorsSection(profile),
      buildTypographySection(profile),
      buildMotifsSection(profile),
      buildArtifactsSection(profile),
      buildVisualReferencesSection(profile),
    ],
    canonContext: buildCanonContext(profile),
  };
}

export function buildRvbrGlance(profile: RvbrProfile): RvbrGlance {
  const mood =
    cleanLine(profile.visualIdentity.sections?.culturalMood) ??
    cleanLine(profile.narrative?.split("\n\n")[0]) ??
    null;
  const moodLine = mood && mood.length > 120 ? `${mood.slice(0, 117)}…` : mood;

  return {
    slug: profile.slug,
    name: profile.name,
    years: `${profile.eraStartYear}–${profile.eraEndYear}`,
    accent: profile.visualIdentity.accent ?? null,
    moodLine,
    hasVisualMapping: Boolean(
      (profile.promptFragments.visualWorlds?.length ?? 0) > 0 ||
        (profile.promptFragments.creativeLabPresets?.length ?? 0) > 0,
    ),
  };
}
