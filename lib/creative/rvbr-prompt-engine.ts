import {
  avoidEraTropesPromptBlock,
  creativeDirectionById,
  creativeDirectionPromptBlock,
  maximizeVariationPromptBlock,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import {
  eraProfilePromptBlock,
  loadRvbrPromptProfile,
} from "@/lib/creative/rvbr-prompt-profile";
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
import type {
  ComposedRvbrPrompt,
  PromptDebugBreakdown,
  PromptQualityLevel,
  PromptQualityScores,
  PromptSide,
} from "@/lib/creative/rvbr-prompt-types";

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
  `- Feels discovered rather than manufactured`,
  `- Music-history object — tangible keepsake from a specific era`,
  `- Authentic printed ephemera — poster, pass, sleeve, card, or promo stock`,
  `- Visual storytelling over form-field layout`,
  `- Avoid generic corporate design, SaaS UI, conference badge templates`,
  `- Retroverse identity: curated, connected, emotionally rich music memorabilia`,
].join("\n");

const ANTI_TEMPLATE_RULES = [
  `ANTI-TEMPLATE RULES:`,
  `- No generic laminate credential with horizontal metadata strips`,
  `- No conference-badge photo holes or lanyard corporate ID`,
  `- No employee-access color-block security zones`,
  `- Vary structural composition across generations`,
].join("\n");

const TEXT_INTEGRATION = [
  `TEXT INTEGRATION:`,
  `- Governed text as poster typography — curved, arched, bannered, hand-lettered`,
  `- Weave event, venue, date, years into borders and illustration — not form fields`,
].join("\n");

const BACK_LAYOUTS = [
  "Souvenir back — metadata in ornamental border; QR medallion and serial plate in lower area.",
  "Handbill reverse — illustration echo; QR seal above collector serial footer.",
  "Ticket back — stub layout; QR in embossed seal, serial in numbering plate.",
  "Poster reverse — ribbon banner text; QR and serial as verification elements.",
  "Memorabilia back — collage ephemera; QR and serial as stamp and seal plates.",
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
      `ERA-DISCOURAGED MOTIFS (do not default to these):`,
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
      ? "portrait VIP laminate collectible pass"
      : `${input.artifactType} collectible artifact`;
  const sideLabel = input.side === "front" ? "FRONT" : "BACK / REVERSE";

  return [
    `RVBR PROMPT ENGINE — ${sideLabel}`,
    `Create a FINISHED ${sideLabel} of a ${artifact}.`,
    `Canvas: ${PASS_WIDTH}×${PASS_HEIGHT}px, portrait, print-ready at 2.25" × 3.5".`,
    `User inputs are governed — never pass raw field values without Retroverse brand orchestration.`,
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
  const motifCount = eraProfile.preferredMotifs.length + eraProfile.preferredComposition.length;
  const eraSpecificity: PromptQualityLevel =
    motifCount >= 8 ? "high" : motifCount >= 4 ? "medium" : "low";

  const brandSpecificity: PromptQualityLevel = "high";

  const variationScore: PromptQualityLevel = input.settings.maximizeVariation ? "high" : "medium";

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

  const textFields: PassTextFields = {
    event: input.fields.event,
    venue: input.fields.venue,
    date: input.fields.date,
    featuredYears: input.fields.featuredYears,
    passTypeLabel: normalizePassTypeLabel(input.fields.passTypeLabel),
  };

  const base = basePromptLayer(input);
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
  const antiCliche = antiClicheLayer(input.settings, eraProfile);
  const layout = layoutRulesLayer(input);
  const eventData = [textGovernancePromptBlock(textFields, input.fields.qrUrl), TEXT_INTEGRATION].join(
    "\n\n",
  );
  const mandate = rvbrEraVisualMandateBlock(input.profile);

  const debugBreakdown: PromptDebugBreakdown = {
    basePrompt: { id: "base", label: "Base Prompt", content: base },
    eraProfile: { id: "era", label: "Era Layer", content: eraProfileContent },
    brandRules: { id: "brand", label: "Brand Layer", content: brand },
    directionRules: { id: "direction", label: "Direction Layer", content: direction },
    antiClicheRules: { id: "anti-cliche", label: "Anti-Cliché Layer", content: antiCliche },
    layoutRules: { id: "layout", label: "Layout Layer", content: layout },
    eventData: { id: "event", label: "Event Data", content: eventData },
    rvbrMandate: { id: "mandate", label: "RVBR Era Mandate", content: mandate },
  };

  const finalPrompt = [
    base,
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
    `═══ ANTI-CLICHÉ ═══`,
    antiCliche,
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
    `FINAL: ${input.side === "front" ? "100% artwork front" : "QR + serial on back"} · Direction: ${dir.label} · Seed: ${input.compositionSeed}`,
  ].join("\n");

  return {
    finalPrompt,
    debugBreakdown,
    qualityScores: scorePromptQuality(input, eraProfile),
  };
}
