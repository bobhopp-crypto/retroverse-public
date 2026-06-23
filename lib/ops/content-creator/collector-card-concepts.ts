import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import type {
  CollectorCardContent,
  CollectorCardPresentation,
} from "@/lib/ops/content-creator/collector-card";
import {
  intelligenceModel,
  ollamaAvailable,
  ollamaGenerate,
  parseJsonFromModel,
} from "@/lib/ops/intelligence/ollama-client";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export const COLLECTOR_CONCEPT_IDS = [
  "memory-object",
  "environment",
  "cultural-artifact",
  "symbolic-metaphor",
] as const;

export type CollectorConceptId = (typeof COLLECTOR_CONCEPT_IDS)[number];
export type CollectorConceptProvider = "local-placeholder";
export type CollectorTextConceptProvider = "ollama" | "rule-based";

export type CollectorConceptInput = {
  id: CollectorConceptId;
  label: string;
  value: string;
};

export type CollectorGeneratedTextConcept = CollectorConceptInput & {
  provider: CollectorTextConceptProvider;
  model: string;
  generatedAt: string;
};

export type CollectorGeneratedConcept = {
  id: CollectorConceptId;
  label: string;
  prompt: string;
  imagePath: string;
  imageUrl: string;
  favorite: boolean;
  generatedAt: string;
};

export type CollectorConceptRatings = {
  feelsLikeMemory: number;
  feelsLikeYear: number;
  feelsUnique: number;
  feelsCollectible: number;
  feelsRetroverse: number;
};

export type CollectorConceptEvaluationNotes = {
  whatWorks: string;
  whatDoesntWork: string;
  freeform: string;
};

export type CollectorConceptEvaluation = {
  id: CollectorConceptId;
  ratings: CollectorConceptRatings;
  total: number;
  notes: CollectorConceptEvaluationNotes;
  rank?: number;
  evaluator?: CollectorTextConceptProvider;
  model?: string;
  updatedAt: string;
};

export type CollectorConceptEvaluationState = {
  targetConceptId: CollectorConceptId | null;
  evaluations: Partial<Record<CollectorConceptId, CollectorConceptEvaluation>>;
  updatedAt: string;
};

export type CollectorConceptFile = {
  version: 1;
  cardId: string;
  conceptProvider?: CollectorTextConceptProvider;
  conceptModel?: string;
  conceptGeneratedAt?: string;
  conceptInputs?: Record<string, unknown>;
  conceptDirections?: CollectorGeneratedTextConcept[];
  provider: CollectorConceptProvider;
  card: {
    content: CollectorCardContent;
    presentation: CollectorCardPresentation;
  };
  selectedStyle: string;
  brandingChoice: string;
  concepts: CollectorGeneratedConcept[];
  evaluation?: CollectorConceptEvaluationState;
  favoriteConceptId: CollectorConceptId | null;
  bestConceptId: CollectorConceptId | null;
  updatedAt: string;
};

type ConceptModelRow = {
  id: CollectorConceptId;
  value: string | string[];
};

type ConceptModelOutput = {
  concepts: ConceptModelRow[];
};

type EvaluationModelRow = {
  id: CollectorConceptId;
  ratings: CollectorConceptRatings;
  whatWorks?: string;
  whatDoesntWork?: string;
  notes?: string;
};

type EvaluationModelOutput = {
  evaluations: EvaluationModelRow[];
};

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function collectorCardId(content: CollectorCardContent, presentation: CollectorCardPresentation): string {
  const rvtr = content.rvtr ? slugPart(content.rvtr) : "no-rvtr";
  const title = slugPart(content.song || "untitled");
  return `${content.year}-${presentation.suit}-${presentation.rank}-${rvtr}-${title}`;
}

function conceptsRoot(): string {
  return join(retroverseDataRoot(), "collector_cards", "concepts");
}

function cardDir(year: number, cardId: string): string {
  return join(conceptsRoot(), String(year), cardId);
}

function conceptFilePath(year: number, cardId: string): string {
  return join(cardDir(year, cardId), `${cardId}.json`);
}

function relPath(year: number, cardId: string, filename: string): string {
  return `${year}/${cardId}/${filename}`;
}

function fileUrl(path: string): string {
  return `/api/ops/content-creator/collector-card/concepts/files/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function conceptTitle(id: CollectorConceptId): string {
  if (id === "memory-object") return "Memory Object";
  if (id === "environment") return "Environment";
  if (id === "cultural-artifact") return "Cultural Artifact";
  return "Symbolic Metaphor";
}

function conceptLabel(id: CollectorConceptId): string {
  if (id === "memory-object") return "Concept A · Memory Object";
  if (id === "environment") return "Concept B · Environment";
  if (id === "cultural-artifact") return "Concept C · Cultural Artifact";
  return "Concept D · Symbolic Metaphor";
}

function normalizeConceptValue(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 5).join("\n");
  }
  return String(value)
    .split(/\n|;/)
    .map((item) => item.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)
    .slice(0, 5)
    .join("\n");
}

function buildConceptBrainstormPrompt(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  selectedStyle: string;
  brandingChoice: string;
}): string {
  return [
    `You are creating visual concept directions for a Retroverse collector card.`,
    `Return JSON only with exactly this shape: {"concepts":[{"id":"memory-object","value":["..."]},{"id":"environment","value":["..."]},{"id":"cultural-artifact","value":["..."]},{"id":"symbolic-metaphor","value":["..."]}]}.`,
    ``,
    `CARD INPUT`,
    `Song title: ${args.content.song}`,
    `Artist: ${args.content.artist}`,
    `Year: ${args.content.year}`,
    `Rank: ${args.presentation.rank}`,
    `Suit: ${args.presentation.suit}`,
    `Fact: ${args.content.fact}`,
    `Selected style: ${args.selectedStyle}`,
    `Selected branding: ${args.brandingChoice || "No branding"}`,
    ``,
    `CRITICAL RULES`,
    `Do NOT generate singers, performers, celebrities, microphones, concerts, stages, crowds, album cover recreations, or AI concert poster ideas.`,
    `Avoid AI concert poster syndrome.`,
    `Prefer objects, environments, architecture, vehicles, fashion items, magazines, technology, home interiors, signage, cultural artifacts, and symbolic imagery.`,
    `Create a memory of the song, not a picture of the artist.`,
    ``,
    `Each value should contain 3 to 5 short visual fragments, concrete and shootable, no paragraphs.`,
  ].join("\n");
}

function ruleBasedConcepts(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  selectedStyle: string;
  brandingChoice: string;
}): CollectorGeneratedTextConcept[] {
  const year = args.content.year;
  const title = args.content.song.toLowerCase();
  const loveMood = /love|heart|everything|tonight|adored|kiss|dream/i.test(title);
  const danceMood = /dance|disco|funk|music|boogie/i.test(title);
  const now = new Date().toISOString();
  const model = "local-rule-based";
  const rows: CollectorConceptInput[] = [
    {
      id: "memory-object",
      label: conceptLabel("memory-object"),
      value: loveMood
        ? "stack of handwritten love letters\nPolaroid photograph\nrotary telephone\npressed flower in a book"
        : "marked-up radio playlist\nworn record adapter\ncreased photo booth strip\npaper matchbook from a diner",
    },
    {
      id: "environment",
      label: conceptLabel("environment"),
      value: danceMood
        ? "empty dance floor after closing\nmirror ball light on polished wood\nneon sign reflected in a window\nplatform shoes near the wall"
        : "quiet suburban bedroom at dusk\nwarm lamp glow\nopen curtains\nradio glowing on a side table",
    },
    {
      id: "cultural-artifact",
      label: conceptLabel("cultural-artifact"),
      value: `${year} teen magazine\nrecord store receipt\nfolded fan letter\nnewspaper entertainment clipping`,
    },
    {
      id: "symbolic-metaphor",
      label: conceptLabel("symbolic-metaphor"),
      value: loveMood
        ? "mailbox overflowing with letters\ntrail of postcards disappearing into sunset\ntelephone cord forming a heart\nporch light left on"
        : "street signs pointing in different directions\nsingle spotlight on an empty object\npaper map with a route circled\nwindow reflection at sunset",
    },
  ];
  return rows.map((row) => ({ ...row, provider: "rule-based", model, generatedAt: now }));
}

export async function generateCollectorTextConcepts(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  selectedStyle: string;
  brandingChoice: string;
  provider: CollectorTextConceptProvider;
}): Promise<{
  provider: CollectorTextConceptProvider;
  model: string;
  concepts: CollectorGeneratedTextConcept[];
}> {
  if (args.provider === "ollama" && (await ollamaAvailable())) {
    try {
      const model = intelligenceModel();
      const raw = await ollamaGenerate(buildConceptBrainstormPrompt(args), {
        format: "json",
        temperature: 0.55,
      });
      const parsed = parseJsonFromModel<ConceptModelOutput>(raw);
      const byId = new Map(parsed.concepts.map((row) => [row.id, row]));
      const generatedAt = new Date().toISOString();
      const concepts = COLLECTOR_CONCEPT_IDS.map((id) => ({
        id,
        label: conceptLabel(id),
        value: normalizeConceptValue(byId.get(id)?.value ?? ""),
        provider: "ollama" as const,
        model,
        generatedAt,
      }));
      if (concepts.every((concept) => concept.value.length > 0)) {
        return { provider: "ollama", model, concepts };
      }
    } catch {
      // Fall through to deterministic local rules.
    }
  }

  const concepts = ruleBasedConcepts(args);
  return { provider: "rule-based", model: "local-rule-based", concepts };
}

function evaluationTotal(ratings: CollectorConceptRatings): number {
  return (
    ratings.feelsLikeMemory +
    ratings.feelsLikeYear +
    ratings.feelsUnique +
    ratings.feelsCollectible +
    ratings.feelsRetroverse
  );
}

function clampRating(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  return Math.max(1, Math.min(5, Math.round(numeric)));
}

function normalizeEvaluationRows(args: {
  rows: EvaluationModelRow[];
  concepts: CollectorGeneratedTextConcept[];
  provider: CollectorTextConceptProvider;
  model: string;
}): CollectorConceptEvaluationState {
  const now = new Date().toISOString();
  const byId = new Map(args.rows.map((row) => [row.id, row]));
  const evaluations = Object.fromEntries(
    args.concepts.map((concept) => {
      const row = byId.get(concept.id);
      const ratings: CollectorConceptRatings = {
        feelsLikeMemory: clampRating(row?.ratings?.feelsLikeMemory),
        feelsLikeYear: clampRating(row?.ratings?.feelsLikeYear),
        feelsUnique: clampRating(row?.ratings?.feelsUnique),
        feelsCollectible: clampRating(row?.ratings?.feelsCollectible),
        feelsRetroverse: clampRating(row?.ratings?.feelsRetroverse),
      };
      return [
        concept.id,
        {
          id: concept.id,
          ratings,
          total: evaluationTotal(ratings),
          notes: {
            whatWorks: row?.whatWorks?.trim() || "Auto-scored for Retroverse memory-card fit.",
            whatDoesntWork: row?.whatDoesntWork?.trim() || "",
            freeform: row?.notes?.trim() || `AI evaluation for ${concept.label}.`,
          },
          evaluator: args.provider,
          model: args.model,
          updatedAt: now,
        } satisfies CollectorConceptEvaluation,
      ];
    }),
  ) as Partial<Record<CollectorConceptId, CollectorConceptEvaluation>>;
  const ranked = args.concepts
    .map((concept) => evaluations[concept.id])
    .filter((item): item is CollectorConceptEvaluation => Boolean(item))
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  ranked.forEach((evaluation, index) => {
    evaluation.rank = index + 1;
  });
  return {
    targetConceptId: ranked[0]?.id ?? null,
    evaluations,
    updatedAt: now,
  };
}

function ruleBasedEvaluation(args: {
  concepts: CollectorGeneratedTextConcept[];
  content: CollectorCardContent;
}): CollectorConceptEvaluationState {
  const title = args.content.song.toLowerCase();
  const loveMood = /love|heart|everything|tonight|adored|kiss|dream/i.test(title);
  const rows = args.concepts.map((concept): EvaluationModelRow => {
    const base = concept.id === "memory-object" ? 4 : concept.id === "environment" ? 4 : 3;
    const ratings: CollectorConceptRatings = {
      feelsLikeMemory: concept.id === "memory-object" || concept.id === "environment" ? 5 : 4,
      feelsLikeYear: concept.value.match(/\b(19\d{2}|rotary|magazine|record|radio|neon|diner|postcard)\b/i) ? 5 : 4,
      feelsUnique: concept.id === "symbolic-metaphor" ? 5 : base,
      feelsCollectible: concept.id === "cultural-artifact" ? 5 : 4,
      feelsRetroverse: loveMood && concept.id === "memory-object" ? 5 : base,
    };
    return {
      id: concept.id,
      ratings,
      whatWorks: "Concrete, non-performer visual language suitable for a collector card.",
      whatDoesntWork: "",
      notes: "Local fallback auto-score.",
    };
  });
  return normalizeEvaluationRows({ rows, concepts: args.concepts, provider: "rule-based", model: "local-rule-based" });
}

function buildEvaluationPrompt(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  concepts: CollectorGeneratedTextConcept[];
}): string {
  return [
    `Score four Retroverse collector card concepts. Return JSON only with shape {"evaluations":[{"id":"memory-object","ratings":{"feelsLikeMemory":1,"feelsLikeYear":1,"feelsUnique":1,"feelsCollectible":1,"feelsRetroverse":1},"whatWorks":"...","whatDoesntWork":"...","notes":"..."}]}.`,
    ``,
    `CARD`,
    `Year: ${args.content.year}`,
    `Song: ${args.content.song}`,
    `Artist: ${args.content.artist}`,
    `Rank/Suit: ${args.presentation.rank} ${args.presentation.suit}`,
    `Fact: ${args.content.fact}`,
    ``,
    `SCORING RULES`,
    `Score each category 1-5. Favor concepts that feel like a memory, not a poster.`,
    `Reject performer/concert/stage/microphone/crowd/celebrity/album-cover thinking.`,
    `Prefer objects, environments, cultural artifacts, symbolic imagery, era texture, and collectible-card scalability.`,
    ``,
    `CONCEPTS`,
    ...args.concepts.map((concept) => `${concept.id}: ${concept.value}`),
  ].join("\n");
}

export async function evaluateCollectorTextConcepts(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  concepts: CollectorGeneratedTextConcept[];
  provider: CollectorTextConceptProvider;
}): Promise<CollectorConceptEvaluationState> {
  if (args.provider === "ollama" && (await ollamaAvailable())) {
    try {
      const model = intelligenceModel();
      const raw = await ollamaGenerate(buildEvaluationPrompt(args), {
        format: "json",
        temperature: 0.15,
      });
      const parsed = parseJsonFromModel<EvaluationModelOutput>(raw);
      if (parsed.evaluations?.length === 4) {
        return normalizeEvaluationRows({
          rows: parsed.evaluations,
          concepts: args.concepts,
          provider: "ollama",
          model,
        });
      }
    } catch {
      // Fall through to deterministic local scoring.
    }
  }
  return ruleBasedEvaluation({ concepts: args.concepts, content: args.content });
}

function buildPrompt(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  concept: CollectorConceptInput;
  selectedStyle: string;
  brandingChoice: string;
}): string {
  const { content, presentation, concept, selectedStyle, brandingChoice } = args;
  return [
    `Retroverse collector card concept image.`,
    `Card: ${content.year} ${presentation.suit} #${presentation.rank}.`,
    `Song: ${content.song}. Artist: ${content.artist}.`,
    `Fact: ${content.fact}`,
    `Concept type: ${conceptTitle(concept.id)}.`,
    `Concept notes: ${concept.value}`,
    `Style: ${selectedStyle}. Branding: ${brandingChoice || "No branding"}.`,
    `Avoid singers, bands, performers, microphones, crowds, stages, concert posters, celebrity portraits, and album-cover recreations.`,
    `Prefer objects, locations, environments, cultural artifacts, symbolic storytelling, and memory-trigger imagery.`,
    `The image should feel like a remembered moment, not a music poster.`,
  ].join("\n");
}

async function writePlaceholderSvg(args: {
  outPath: string;
  title: string;
  subtitle: string;
  prompt: string;
  seed: string;
}): Promise<void> {
  const palette =
    args.seed === "environment"
      ? ["#0f5758", "#8fc7bd", "#fff0cf"]
      : args.seed === "cultural-artifact"
        ? ["#6d5237", "#f4e7c7", "#e0552f"]
        : args.seed === "symbolic-metaphor"
          ? ["#e0552f", "#ffcf73", "#281f16"]
          : ["#281f16", "#ead7a9", "#0f5758"];
  const promptLines = args.prompt.split("\n").slice(0, 5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
  <rect width="1024" height="1536" fill="${palette[1]}"/>
  <rect x="64" y="64" width="896" height="1408" fill="#fff7e3" stroke="${palette[0]}" stroke-width="18"/>
  <rect x="128" y="154" width="768" height="820" fill="${palette[2]}" stroke="${palette[0]}" stroke-width="8" stroke-dasharray="24 18"/>
  <circle cx="512" cy="564" r="180" fill="none" stroke="${palette[0]}" stroke-width="10" opacity="0.38"/>
  <path d="M224 740 C360 620 456 820 608 696 C724 604 792 690 832 640" fill="none" stroke="${palette[0]}" stroke-width="12" opacity="0.45"/>
  <text x="512" y="246" font-family="Georgia, serif" font-size="58" font-weight="700" text-anchor="middle" fill="${palette[0]}">${escapeXml(args.title)}</text>
  <text x="512" y="1048" font-family="Helvetica, Arial, sans-serif" font-size="42" font-weight="800" text-anchor="middle" fill="${palette[0]}">${escapeXml(args.subtitle)}</text>
  ${promptLines
    .map((line, index) => `<text x="140" y="${1130 + index * 48}" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="${palette[0]}">${escapeXml(line.slice(0, 64))}</text>`)
    .join("")}
  <text x="512" y="1416" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="800" text-anchor="middle" fill="${palette[0]}">LOCAL PLACEHOLDER PROVIDER</text>
</svg>`;
  await writeFile(args.outPath, svg, "utf8");
}

export async function loadCollectorConceptFile(
  content: CollectorCardContent,
  presentation: CollectorCardPresentation,
): Promise<CollectorConceptFile | null> {
  const cardId = collectorCardId(content, presentation);
  try {
    const raw = await readFile(conceptFilePath(content.year, cardId), "utf8");
    return JSON.parse(raw) as CollectorConceptFile;
  } catch {
    return null;
  }
}

export async function saveCollectorConceptFile(file: CollectorConceptFile): Promise<CollectorConceptFile> {
  await mkdir(cardDir(file.card.content.year, file.cardId), { recursive: true });
  await writeFile(conceptFilePath(file.card.content.year, file.cardId), `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return file;
}

export async function saveCollectorTextConcepts(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  selectedStyle: string;
  brandingChoice: string;
  concepts: CollectorGeneratedTextConcept[];
  provider: CollectorTextConceptProvider;
  model: string;
  evaluation?: CollectorConceptEvaluationState;
  favoriteConceptId?: CollectorConceptId | null;
}): Promise<CollectorConceptFile> {
  const cardId = collectorCardId(args.content, args.presentation);
  const existing = await loadCollectorConceptFile(args.content, args.presentation);
  const now = new Date().toISOString();
  return saveCollectorConceptFile({
    version: 1,
    cardId,
    conceptProvider: args.provider,
    conceptModel: args.model,
    conceptGeneratedAt: now,
    conceptInputs: {
      song: args.content.song,
      artist: args.content.artist,
      year: args.content.year,
      rank: args.presentation.rank,
      suit: args.presentation.suit,
      fact: args.content.fact,
      selectedStyle: args.selectedStyle,
      brandingChoice: args.brandingChoice,
    },
    conceptDirections: args.concepts,
    provider: existing?.provider ?? "local-placeholder",
    card: { content: args.content, presentation: args.presentation },
    selectedStyle: args.selectedStyle,
    brandingChoice: args.brandingChoice,
    concepts: existing?.concepts ?? [],
    evaluation: args.evaluation ?? existing?.evaluation,
    favoriteConceptId: args.favoriteConceptId ?? existing?.favoriteConceptId ?? null,
    bestConceptId: existing?.bestConceptId ?? null,
    updatedAt: now,
  });
}

export async function saveCollectorEvaluation(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  selectedStyle: string;
  brandingChoice: string;
  evaluation: CollectorConceptEvaluationState;
}): Promise<CollectorConceptFile> {
  const cardId = collectorCardId(args.content, args.presentation);
  const existing = await loadCollectorConceptFile(args.content, args.presentation);
  const now = new Date().toISOString();
  return saveCollectorConceptFile({
    version: 1,
    cardId,
    conceptProvider: existing?.conceptProvider,
    conceptModel: existing?.conceptModel,
    conceptGeneratedAt: existing?.conceptGeneratedAt,
    conceptInputs: existing?.conceptInputs,
    conceptDirections: existing?.conceptDirections ?? [],
    provider: existing?.provider ?? "local-placeholder",
    card: { content: args.content, presentation: args.presentation },
    selectedStyle: existing?.selectedStyle ?? args.selectedStyle,
    brandingChoice: existing?.brandingChoice ?? args.brandingChoice,
    concepts: existing?.concepts ?? [],
    evaluation: {
      targetConceptId: args.evaluation.targetConceptId,
      evaluations: args.evaluation.evaluations,
      updatedAt: now,
    },
    favoriteConceptId: existing?.favoriteConceptId ?? null,
    bestConceptId: existing?.bestConceptId ?? null,
    updatedAt: now,
  });
}

export async function generateCollectorConcepts(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  concepts: CollectorConceptInput[];
  selectedStyle: string;
  brandingChoice: string;
  provider: CollectorConceptProvider;
  regenerateConceptId?: CollectorConceptId;
}): Promise<CollectorConceptFile> {
  const cardId = collectorCardId(args.content, args.presentation);
  const existing = await loadCollectorConceptFile(args.content, args.presentation);
  const now = new Date().toISOString();
  const nextConcepts = new Map<CollectorConceptId, CollectorGeneratedConcept>();
  for (const concept of existing?.concepts ?? []) nextConcepts.set(concept.id, concept);

  for (const concept of args.concepts) {
    if (args.regenerateConceptId && args.regenerateConceptId !== concept.id) continue;
    const prompt = buildPrompt({
      content: args.content,
      presentation: args.presentation,
      concept,
      selectedStyle: args.selectedStyle,
      brandingChoice: args.brandingChoice,
    });
    const filename = `${concept.id}.svg`;
    const relative = relPath(args.content.year, cardId, filename);
    const outPath = join(cardDir(args.content.year, cardId), filename);
    await mkdir(cardDir(args.content.year, cardId), { recursive: true });
    await writePlaceholderSvg({
      outPath,
      title: conceptTitle(concept.id),
      subtitle: `${args.content.song} · ${args.content.artist}`,
      prompt,
      seed: concept.id,
    });
    nextConcepts.set(concept.id, {
      id: concept.id,
      label: conceptTitle(concept.id),
      prompt,
      imagePath: relative,
      imageUrl: fileUrl(relative),
      favorite: existing?.favoriteConceptId === concept.id || nextConcepts.get(concept.id)?.favorite === true,
      generatedAt: now,
    });
  }

  return saveCollectorConceptFile({
    version: 1,
    cardId,
    conceptProvider: existing?.conceptProvider,
    conceptModel: existing?.conceptModel,
    conceptGeneratedAt: existing?.conceptGeneratedAt,
    conceptInputs: existing?.conceptInputs,
    conceptDirections: existing?.conceptDirections,
    provider: args.provider,
    card: { content: args.content, presentation: args.presentation },
    selectedStyle: args.selectedStyle,
    brandingChoice: args.brandingChoice,
    concepts: COLLECTOR_CONCEPT_IDS.map((id) => nextConcepts.get(id)).filter((item): item is CollectorGeneratedConcept => Boolean(item)),
    evaluation: existing?.evaluation,
    favoriteConceptId: existing?.favoriteConceptId ?? null,
    bestConceptId: existing?.bestConceptId ?? null,
    updatedAt: now,
  });
}
