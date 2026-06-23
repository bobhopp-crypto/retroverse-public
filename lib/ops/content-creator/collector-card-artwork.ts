import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import type {
  CollectorCardContent,
  CollectorCardPresentation,
} from "@/lib/ops/content-creator/collector-card";
import { COLLECTOR_CARD_SUIT_LABELS } from "@/lib/ops/content-creator/collector-card";
import { collectorCardId, type CollectorConceptId } from "@/lib/ops/content-creator/collector-card-concepts";
import { generateOpenAIArtwork } from "@/lib/ops/creative-lab/artwork/openai-provider";
import type { ArtworkPromptContext } from "@/lib/ops/creative-lab/artwork/types";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export type CollectorArtworkProvider = "chatgpt-images";
export type CollectorArtworkStatus = "not-generated" | "generated" | "approved";

export type CollectorArtworkConcept = {
  id: CollectorConceptId;
  label: string;
  value: string;
};

export type CollectorArtworkVariation = {
  id: string;
  index: number;
  imagePath: string;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
};

export type CollectorArtworkFile = {
  version: 1;
  cardId: string;
  provider: CollectorArtworkProvider;
  status: CollectorArtworkStatus;
  prompt: string;
  card: {
    content: CollectorCardContent;
    presentation: CollectorCardPresentation;
  };
  selectedConceptId: CollectorConceptId | null;
  selectedConcept: CollectorArtworkConcept | null;
  selectedStyle: string;
  brandingChoice: string;
  variations: CollectorArtworkVariation[];
  favoriteVariationId: string | null;
  generatedAt: string;
  updatedAt: string;
};

function artworkRoot(): string {
  return join(retroverseDataRoot(), "collector_cards", "artwork");
}

function cardDir(year: number, cardId: string): string {
  return join(artworkRoot(), String(year), cardId);
}

function artworkFilePath(year: number, cardId: string): string {
  return join(cardDir(year, cardId), "artwork.json");
}

function relPath(year: number, cardId: string, filename: string): string {
  return `${year}/${cardId}/${filename}`;
}

function fileUrl(path: string): string {
  return `/api/ops/content-creator/collector-card/artwork/files/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function brandingLabel(id: string): string {
  if (id === "none") return "No branding";
  if (id === "press-play") return "Press Play for the Past";
  if (id === "era-collection") return "Retroverse Era Collection";
  return "Retroverse";
}

function styleLabel(id: string): string {
  if (id === "vintage-magazine") return "Vintage Magazine";
  if (id === "museum-artifact") return "Museum Artifact";
  if (id === "record-sleeve") return "Record Sleeve";
  if (id === "trading-card") return "Trading Card";
  return "Retroverse Signature";
}

export function composeCollectorCardArtworkPrompt(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  concept: CollectorArtworkConcept | null;
  selectedStyle: string;
  brandingChoice: string;
}): string {
  const conceptText = args.concept
    ? [`Selected target concept: ${args.concept.label}`, args.concept.value].join("\n")
    : "Selected target concept: none selected. Use the card fact and song memory as the source.";
  return [
    `Create ONE finished front artwork for a Retroverse collector card.`,
    `Portrait card ratio, 2.25 x 3.5 inch collector card, artwork-first composition.`,
    ``,
    `CARD METADATA`,
    `Year: ${args.content.year}`,
    `Suit: ${COLLECTOR_CARD_SUIT_LABELS[args.presentation.suit]}`,
    `Rank: ${args.presentation.rank}`,
    `Song: ${args.content.song}`,
    `Artist: ${args.content.artist}`,
    `Retroverse Hot 100 rank: ${args.content.chartPosition ? `#${args.content.chartPosition}` : "Retroverse Pick"}`,
    `Fact text: ${args.content.fact}`,
    ``,
    `TARGET CONCEPT`,
    conceptText,
    ``,
    `STYLE`,
    `Layout style: ${styleLabel(args.selectedStyle)}`,
    `Branding: ${brandingLabel(args.brandingChoice)}`,
    `The card should feel tactile, printed, collectible, warm, editorial, and retro-futurist.`,
    `Use cream paper, teal accents, orange/red highlights, thick outlines, strong card framing, and readable hierarchy when appropriate.`,
    ``,
    `CRITICAL NEGATIVE RULES`,
    `No performers.`,
    `No singers.`,
    `No microphones.`,
    `No stages.`,
    `No crowds.`,
    `No concert posters.`,
    `No celebrity likenesses.`,
    `No album cover recreation.`,
    ``,
    `PREFER`,
    `Objects, environments, symbolism, memories, cultural artifacts, architecture, vehicles, fashion items, magazines, technology, home interiors, signage, and era-specific ephemera.`,
    ``,
    `RETROVERSE PHILOSOPHY`,
    `The card should feel like a memory, not a performance.`,
    `Create the emotional residue of the song without showing the artist.`,
    ``,
    `CARD LAYOUT REQUIREMENTS`,
    `Artwork dominates the card face.`,
    `Song title, artist, year, one-line fact, and upper-right rank/suit should be part of the collector-card design language.`,
    `Do not use mirrored playing-card corners or casino styling.`,
  ].join("\n");
}

function artworkContext(prompt: string, content: CollectorCardContent): ArtworkPromptContext {
  return {
    prompt,
    artifactTypeId: "vip-pass",
    event: content.song,
    venue: content.artist,
    date: String(content.year),
    secondaryLine: content.fact,
    module: "pass-lab",
    artDirectionTitle: "Retroverse Collector Card",
    treatmentLabel: "collector-card-artwork",
  };
}

export async function loadCollectorArtworkFile(
  content: CollectorCardContent,
  presentation: CollectorCardPresentation,
): Promise<CollectorArtworkFile | null> {
  const cardId = collectorCardId(content, presentation);
  try {
    const raw = await readFile(artworkFilePath(content.year, cardId), "utf8");
    return JSON.parse(raw) as CollectorArtworkFile;
  } catch {
    return null;
  }
}

export async function saveCollectorArtworkFile(file: CollectorArtworkFile): Promise<CollectorArtworkFile> {
  await mkdir(cardDir(file.card.content.year, file.cardId), { recursive: true });
  await writeFile(artworkFilePath(file.card.content.year, file.cardId), `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return file;
}

export async function generateCollectorCardArtwork(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  concept: CollectorArtworkConcept | null;
  selectedStyle: string;
  brandingChoice: string;
}): Promise<CollectorArtworkFile> {
  const cardId = collectorCardId(args.content, args.presentation);
  const now = new Date().toISOString();
  const prompt = composeCollectorCardArtworkPrompt(args);
  const result = await generateOpenAIArtwork(artworkContext(prompt, args.content), {
    count: 4,
    quality: "medium",
    size: "1024x1536",
  });
  if (result.images.length < 4) {
    throw new Error(`Expected 4 artwork variations, received ${result.images.length}`);
  }
  const outDir = cardDir(args.content.year, cardId);
  await mkdir(outDir, { recursive: true });
  const variations: CollectorArtworkVariation[] = [];
  for (const image of result.images.slice(0, 4)) {
    const filename = `variation-${String(image.index).padStart(2, "0")}.png`;
    const relative = relPath(args.content.year, cardId, filename);
    await writeFile(join(outDir, filename), image.buffer);
    variations.push({
      id: `variation-${image.index}`,
      index: image.index,
      imagePath: relative,
      imageUrl: fileUrl(relative),
      prompt,
      generatedAt: now,
    });
  }

  return saveCollectorArtworkFile({
    version: 1,
    cardId,
    provider: "chatgpt-images",
    status: variations.length > 0 ? "generated" : "not-generated",
    prompt,
    card: { content: args.content, presentation: args.presentation },
    selectedConceptId: args.concept?.id ?? null,
    selectedConcept: args.concept,
    selectedStyle: args.selectedStyle,
    brandingChoice: args.brandingChoice,
    variations,
    favoriteVariationId: null,
    generatedAt: now,
    updatedAt: now,
  });
}

export async function updateCollectorArtworkSelection(args: {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
  favoriteVariationId?: string | null;
  approve?: boolean;
}): Promise<CollectorArtworkFile> {
  const existing = await loadCollectorArtworkFile(args.content, args.presentation);
  if (!existing) throw new Error("artwork_file_not_found");
  const now = new Date().toISOString();
  const favoriteVariationId = args.favoriteVariationId ?? existing.favoriteVariationId;
  return saveCollectorArtworkFile({
    ...existing,
    favoriteVariationId,
    status: args.approve ? "approved" : favoriteVariationId ? "generated" : existing.status,
    updatedAt: now,
  });
}
