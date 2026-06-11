import { antiRepetitionPromptBlock } from "@/lib/creative/anti-repetition";
import {
  artifactArchetypeById,
  artifactArchetypePromptBlock,
  resolveArtifactArchetype,
} from "@/lib/creative/artifact-archetypes";
import {
  eraProfilePromptBlock,
  loadRvbrPromptProfile,
} from "@/lib/creative/rvbr-prompt-profile";
import type {
  ComposedRvbrPrompt,
  PromptDebugBreakdown,
  PromptQualityLevel,
  PromptQualityScores,
  PromptSide,
} from "@/lib/creative/rvbr-prompt-types";
import { venueReferencePromptBlock } from "@/lib/creative/venue-references";
import {
  avoidEraTropesPromptBlock,
  creativeDirectionById,
  creativeDirectionPromptBlock,
  maximizeVariationPromptBlock,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import {
  fullBleedFrontPrompt,
  integratedBackFunctionalZonesPrompt,
  PASS_HEIGHT,
  PASS_WIDTH,
} from "@/lib/ops/creative-lab/pass-layout";
import {
  normalizePassTypeLabel,
  textGovernancePromptBlock,
  type PassTextFields,
} from "@/lib/ops/creative-lab/pass-text-governance";
import { visualWorldById } from "@/lib/ops/creative-lab/visual-worlds";
import type { CollectiblePassFields } from "@/lib/ops/content-creator/collectible-pass-prompt";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import { rvbrEraVisualMandateBlock } from "@/lib/ops/content-creator/rvbr-era-visual-dna";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import { buildRvbrPresentation } from "@/lib/ops/rvbr/presentation";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type {
  ComposedRvbrPrompt,
  PromptDebugBreakdown,
  PromptLayer,
  PromptQualityLevel,
  PromptQualityScores,
  PromptSide,
} from "@/lib/creative/rvbr-prompt-types";

export type RvbrPromptEngineInput = {
  side: PromptSide;
  profile: RvbrProfile;
  fields: CollectiblePassFields;
  settings: CreativeDirectionSettings;
  artifactType: ContentArtifactType;
  compositionSeed: number;
  frontSummary?: string;
};

const RETROVERSE_BRAND_RULES = [
  `RETROVERSE BRAND RULES:`,
  `- Collectible artifact first, credential second`,
  `- Feels discovered rather than manufactured — music-history object, not AI poster art`,
  `- Authentic printed ephemera: ticket, pass, sleeve, card, invite, laminate, promo stock`,
  `- Tangible keepsake from the Retroverse universe — not generic decorated template`,
  `- Visual storytelling over form-field layout`,
  `- Avoid generic corporate design, SaaS UI, conference badge templates`,
].join("\n");

const ANTI_TEMPLATE_RULES = [
  `ANTI-TEMPLATE RULES:`,
  `- No generic laminate credential with horizontal metadata strips`,
  `- No BIG TITLE → BIG ART → DATE → YEARS stacked poster layout`,
  `- No conference-badge photo holes or lanyard corporate ID`,
  `- Each artifact archetype must produce a materially different object type`,
].join("\n");

const TEXT_INTEGRATION = [
  `TEXT INTEGRATION:`,
  `- Governed text woven into artifact structure — not form fields`,
  `- Typography follows archetype object type (ticket stub, press card, laminate plate, etc.)`,
].join("\n");

const BACK_LAYOUTS = [
  "Souvenir back — metadata in ornamental border; QR medallion and serial plate in lower area.",
  "Handbill reverse — illustration echo; QR seal above collector serial footer.",
  "Ticket back — stub layout; QR in embossed seal, serial in numbering plate.",
  "Label promo reverse — catalog strip and QR verification medallion.",
  "Press credential back — editorial footer and QR press corps stamp.",
] as const;

function pickBackLayout(seed: number): string {
  return BACK_LAYOUTS[Math.abs(seed + 17) % BACK_LAYOUTS.length]!;
}

function rvbrVisualDnaBlock(profile: RvbrProfile): string {
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
  const colors = presentation.sections
    .find((s) => s.id === "colors")
    ?.swatches?.slice(0, 6)
    .map((s) => s.hex)
    .join(", ");

  return [
    `RVBR VISUAL DNA — ${profile.name}:`,
    mood ? `Mood: ${mood}` : "",
    colors ? `Palette anchors: ${colors}` : "",
    typography ? `Typography: ${typography}` : "",
    presentation.lede ? `Era character: ${presentation.lede}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function antiClicheLayer(
  settings: CreativeDirectionSettings,
  eraProfile: ReturnType<typeof loadRvbrPromptProfile>,
): string {
  const parts: string[] = [];

  if (settings.avoidEraTropes) {
    const generic = avoidEraTropesPromptBlock(true);
    if (generic) parts.push(generic);
  }

  if (eraProfile.discouragedMotifs.length) {
    parts.push(
      `ERA-DISCOURAGED MOTIFS:`,
      ...eraProfile.discouragedMotifs.map((m) => `- ${m}`),
    );
  }

  if (settings.avoidEraTropes && eraProfile.negativePromptTerms.length) {
    parts.push(
      `NEGATIVE PROMPT TERMS — do not illustrate:`,
      eraProfile.negativePromptTerms.join(", "),
    );
  }

  if (!parts.length) {
    return `ANTI-CLICHE: disabled — era tropes not filtered.`;
  }

  return parts.join("\n");
}

function basePromptLayer(input: RvbrPromptEngineInput): string {
  const artifact =
    input.artifactType === "pass"
      ? "portrait Retroverse collectible pass"
      : `${input.artifactType} collectible artifact`;
  const sideLabel = input.side === "front" ? "FRONT" : "BACK / REVERSE";

  return [
    `RVBR PROMPT ENGINE — ${sideLabel}`,
    `Create a FINISHED ${sideLabel} of a ${artifact}.`,
    `Canvas: ${PASS_WIDTH}×${PASS_HEIGHT}px, portrait, print-ready at 2.25" × 3.5".`,
    `User inputs pass through Retroverse brand orchestration — never raw to the image model.`,
    ANTI_TEMPLATE_RULES,
  ].join("\n");
}

function layoutRulesLayer(input: RvbrPromptEngineInput): string {
  if (input.side === "front") {
    return [fullBleedFrontPrompt(), maximizeVariationPromptBlock(input.settings.maximizeVariation)]
      .filter(Boolean)
      .join("\n\n");
  }

  const backLayout = pickBackLayout(input.compositionSeed);
  const frontCtx = input.frontSummary ? `Front context: ${input.frontSummary}\n` : "";

  return [
    frontCtx + `Back layout variation: ${backLayout}`,
    integratedBackFunctionalZonesPrompt(),
    maximizeVariationPromptBlock(input.settings.maximizeVariation),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function scorePromptQuality(
  input: RvbrPromptEngineInput,
  eraProfile: ReturnType<typeof loadRvbrPromptProfile>,
): PromptQualityScores {
  const motifCount =
    eraProfile.preferredMotifs.length +
    eraProfile.preferredComposition.length +
    (eraProfile.compositionVariety?.length ?? 0);
  const eraSpecificity: PromptQualityLevel =
    motifCount >= 10 ? "high" : motifCount >= 5 ? "medium" : "low";

  const brandSpecificity: PromptQualityLevel = "high";

  const variationScore: PromptQualityLevel =
    input.settings.maximizeVariation && input.settings.artifactArchetype === "random"
      ? "high"
      : input.settings.maximizeVariation
        ? "medium"
        : "low";

  let clicheRisk: PromptQualityLevel = "medium";
  if (input.settings.avoidEraTropes && eraProfile.negativePromptTerms.length >= 4) {
    clicheRisk = "low";
  } else if (!input.settings.avoidEraTropes) {
    clicheRisk = "high";
  }

  return { eraSpecificity, brandSpecificity, variationScore, clicheRisk };
}

/** Branded prompt orchestration — user input never reaches the image model directly. */
export function composeRvbrPrompt(input: RvbrPromptEngineInput): ComposedRvbrPrompt {
  const eraProfile = loadRvbrPromptProfile(input.profile.slug);
  const world = visualWorldById(resolveVisualWorldFromRvbr(input.profile));
  const dir = creativeDirectionById(input.settings.creativeDirection);
  const eraLabel = `${input.profile.name} (${input.profile.eraStartYear}–${input.profile.eraEndYear})`;

  const archetypeId = resolveArtifactArchetype(
    input.settings.artifactArchetype,
    input.compositionSeed,
  );
  const archetype = artifactArchetypeById(archetypeId);

  const textFields: PassTextFields = {
    event: input.fields.event,
    venue: input.fields.venue,
    date: input.fields.date,
    featuredYears: input.fields.featuredYears,
    passTypeLabel: normalizePassTypeLabel(input.fields.passTypeLabel),
  };

  const base = basePromptLayer(input);
  const archetypeContent = artifactArchetypePromptBlock(archetype, input.compositionSeed);
  const eraProfileContent = [
    eraProfilePromptBlock(eraProfile, eraLabel),
    rvbrVisualDnaBlock(input.profile),
    `Visual world support: ${world.title}`,
    `Palette: ${world.palette.join(", ")}`,
    `Border: ${world.borderStyle}`,
    `Typography mood: ${world.typographyStyle}`,
  ].join("\n\n");

  const brand = RETROVERSE_BRAND_RULES;
  const direction = creativeDirectionPromptBlock(input.settings, input.compositionSeed);
  const venueRef =
    venueReferencePromptBlock(input.fields.venue) ??
    `VENUE: No reference asset for "${input.fields.venue}" — use typographic venue treatment only. Do not invent or illustrate a fictional building facade.`;
  const antiCliche = antiClicheLayer(input.settings, eraProfile);
  const antiRep = antiRepetitionPromptBlock(
    input.profile.slug,
    eraProfile,
    input.settings.maximizeVariation,
  );
  const layout = layoutRulesLayer(input);
  const eventData = [textGovernancePromptBlock(textFields, input.fields.qrUrl), TEXT_INTEGRATION].join(
    "\n\n",
  );
  const mandate = rvbrEraVisualMandateBlock(input.profile);

  const debugBreakdown: PromptDebugBreakdown = {
    basePrompt: { id: "base", label: "Base Prompt", content: base },
    artifactArchetype: { id: "archetype", label: "Artifact Archetype", content: archetypeContent },
    eraProfile: { id: "era", label: "Era Layer", content: eraProfileContent },
    brandRules: { id: "brand", label: "Brand Layer", content: brand },
    directionRules: { id: "direction", label: "Direction Layer", content: direction },
    venueReference: { id: "venue", label: "Venue Reference", content: venueRef },
    antiClicheRules: { id: "anti-cliche", label: "Anti-Cliché Layer", content: antiCliche },
    antiRepetition: { id: "anti-repetition", label: "Anti-Repetition Layer", content: antiRep },
    layoutRules: { id: "layout", label: "Layout Layer", content: layout },
    eventData: { id: "event", label: "Event Data", content: eventData },
    rvbrMandate: { id: "mandate", label: "RVBR Era Mandate", content: mandate },
  };

  const finalPrompt = [
    base,
    ``,
    `═══ ARTIFACT ARCHETYPE ═══`,
    archetypeContent,
    ``,
    `═══ ERA STYLE ═══`,
    eraProfileContent,
    ``,
    `═══ RETROVERSE BRAND ═══`,
    brand,
    ``,
    `═══ CREATIVE DIRECTION ═══`,
    direction,
    ``,
    `═══ VENUE REFERENCE ═══`,
    venueRef,
    ``,
    `═══ ANTI-CLICHÉ ═══`,
    antiCliche,
    ``,
    `═══ ANTI-REPETITION ═══`,
    antiRep,
    ``,
    `═══ LAYOUT ═══`,
    layout,
    ``,
    `═══ EVENT DATA ═══`,
    eventData,
    ``,
    `═══ RVBR ERA MANDATE (PRIMARY) ═══`,
    mandate,
    ``,
    `FINAL: ${input.side === "front" ? "100% artwork front" : "QR + serial on back"} · Archetype: ${archetype.label} · Direction: ${dir.label} · Seed: ${input.compositionSeed}`,
  ].join("\n");

  return {
    finalPrompt,
    debugBreakdown,
    qualityScores: scorePromptQuality(input, eraProfile),
  };
}
