import {
  fullBleedFrontPrompt,
  integratedBackFunctionalZonesPrompt,
  PASS_HEIGHT,
  PASS_WIDTH,
} from "@/lib/ops/creative-lab/pass-layout";
import {
  creativeDirectionById,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import {
  renderCollectibleBackPrompt,
  renderCollectibleFrontPrompt,
  type CollectiblePassFields,
} from "@/lib/ops/content-creator/collectible-pass-prompt";
import { rvbrEraVisualMandateBlock } from "@/lib/ops/content-creator/rvbr-era-visual-dna";
import { buildRvbrPresentation } from "@/lib/ops/rvbr/presentation";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";
import { textGovernancePromptBlock } from "@/lib/ops/creative-lab/pass-text-governance";

export type ArtDirectorFields = CollectiblePassFields;

export type ArtDirectorPromptInput = {
  profile: RvbrProfile;
  fields: ArtDirectorFields;
  compositionSeed?: number;
  settings: CreativeDirectionSettings;
};

/** RVBR visual DNA — era visual language only (not composition/subject). */
export function rvbrVisualDnaBlock(profile: RvbrProfile): string {
  const presentation = buildRvbrPresentation(profile);
  const mood = presentation.sections
    .find((s) => s.id === "mood")
    ?.lines.slice(0, 4)
    .map((l) => l.text)
    .join(" · ");
  const typography = presentation.sections
    .find((s) => s.id === "typography")
    ?.lines.slice(0, 3)
    .map((l) => l.text)
    .join(" · ");
  const motifs = presentation.sections
    .find((s) => s.id === "motifs")
    ?.lines.slice(0, 4)
    .map((l) => l.text)
    .join(" · ");
  const colors = presentation.sections
    .find((s) => s.id === "colors")
    ?.swatches?.slice(0, 6)
    .map((s) => s.hex)
    .join(", ");
  const refs = presentation.sections
    .find((s) => s.id === "visual-references")
    ?.lines.slice(0, 5)
    .map((l) => l.text)
    .join(" · ");

  return [
    `ERA VISUAL DNA — ${profile.name} (${profile.eraStartYear}–${profile.eraEndYear}):`,
    `Scope: visual language ONLY — palette, type, ornament, texture. NOT layout or subject.`,
    mood ? `Mood: ${mood}` : "",
    colors ? `Palette anchors: ${colors}` : "",
    typography ? `Typography: ${typography}` : "",
    motifs ? `Motifs & framing: ${motifs}` : "",
    refs ? `Visual references: ${refs}` : "",
    presentation.lede ? `Era character: ${presentation.lede}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Finished collectible front — era style + creative direction + event data. */
export function renderArtDirectorFrontPrompt(
  profile: RvbrProfile,
  fields: ArtDirectorFields,
  compositionSeed: number = Date.now(),
  settings: CreativeDirectionSettings,
): string {
  const dir = creativeDirectionById(settings.creativeDirection);
  const base = renderCollectibleFrontPrompt(profile, fields, compositionSeed, settings);

  return [
    base,
    ``,
    `═══ RVBR ERA MANDATE (PRIMARY — VISUAL LANGUAGE) ═══`,
    rvbrEraVisualMandateBlock(profile),
    ``,
    rvbrVisualDnaBlock(profile),
    ``,
    `Direction: ${dir.label} · Variation seed: ${compositionSeed}`,
  ].join("\n");
}

/** Finished collectible back — mirrors front; QR + serial on back only. */
export function renderArtDirectorBackPrompt(
  profile: RvbrProfile,
  fields: ArtDirectorFields,
  compositionSeed: number = Date.now(),
  settings: CreativeDirectionSettings,
): string {
  const dir = creativeDirectionById(settings.creativeDirection);
  const frontSummary = `${profile.name} · ${dir.label} · seed ${compositionSeed}`;

  const base = renderCollectibleBackPrompt(profile, fields, compositionSeed, settings, frontSummary);

  return [
    base,
    ``,
    `═══ RVBR ERA MANDATE (PRIMARY — VISUAL LANGUAGE) ═══`,
    rvbrEraVisualMandateBlock(profile),
  ].join("\n");
}

/** ChatGPT-style edit — refine existing collectible. */
export function renderArtDirectorEditPrompt(args: {
  profile: RvbrProfile;
  fields: ArtDirectorFields;
  side: "front" | "back";
  instruction: string;
  settings?: CreativeDirectionSettings;
}): string {
  const sideLabel = args.side === "front" ? "FRONT" : "BACK / REVERSE";

  return [
    `EDIT EXISTING COLLECTIBLE — ${sideLabel} SIDE`,
    `Apply this creative direction: "${args.instruction.trim()}"`,
    ``,
    `Preserve governed text exactly. Collectible souvenir — not a credential template.`,
    args.side === "front"
      ? fullBleedFrontPrompt()
      : integratedBackFunctionalZonesPrompt(),
    ``,
    textGovernancePromptBlock(args.fields, args.fields.qrUrl),
    ``,
    rvbrEraVisualMandateBlock(args.profile),
    ``,
    rvbrVisualDnaBlock(args.profile),
    ``,
    `Canvas: ${PASS_WIDTH}×${PASS_HEIGHT}.`,
  ]
    .filter(Boolean)
    .join("\n");
}
