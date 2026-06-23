import { randomUUID } from "crypto";

import { ollamaGenerate, parseJsonFromModel } from "./ollama-client";
import {
  anchorInExcerpt,
  chartFactMatchesCanonical,
  computeFactConfidence,
  normalizeFactText,
  passesPoetryFilter,
  type RawExtractedFact,
} from "./fact-validation";
import { isExternalVaultEntry } from "./canon-priority";
import { extractPatternFacts } from "./pattern-extract";
import { buildFactExtractionPrompt } from "./prompts";
import type {
  CandidateFact,
  FactCategory,
  ResearchVaultEntry,
  SongPackageMetadata,
} from "./song-package-types";

type ModelFactRow = {
  factText: string;
  category: FactCategory;
  excerptAnchor: string;
  confidence: number;
};

type ModelFactOutput = {
  facts: ModelFactRow[];
};

function extractArray<T>(parsed: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const val = parsed[key];
    if (Array.isArray(val)) return val as T[];
  }
  return [];
}

const VALID_CATEGORIES = new Set<FactCategory>([
  "recording",
  "video",
  "performance",
  "chart",
  "quote",
  "artist",
  "album",
  "cultural_impact",
  "tv_film",
  "trivia",
]);

function toCandidateFact(
  raw: RawExtractedFact,
  vaultEntry: ResearchVaultEntry,
  metadata: SongPackageMetadata,
  extractionMethod: CandidateFact["extractionMethod"],
): CandidateFact | null {
  const anchorOk = anchorInExcerpt(raw.excerptAnchor, vaultEntry.excerpt);
  if (!anchorOk) return null;
  if (!passesPoetryFilter(raw.factText)) return null;
  if (!chartFactMatchesCanonical(raw.factText, metadata)) return null;

  const factText = normalizeFactText(raw.factText);

  return {
    id: randomUUID(),
    category: raw.category,
    factText,
    sourceType: "research_vault",
    sourceId: vaultEntry.id,
    sourceUrl: vaultEntry.url || null,
    sourceExcerpt: vaultEntry.excerpt.slice(0, 2000),
    excerptAnchor: raw.excerptAnchor.trim(),
    confidence: computeFactConfidence(
      raw.confidence,
      vaultEntry.confidence,
      anchorOk,
      metadata,
      factText,
    ),
    importance: raw.confidence,
    locked: false,
    extractionMethod,
    reviewStatus: "pending",
    createdAt: new Date().toISOString(),
  };
}

async function extractFactsFromExcerpt(
  vaultEntry: ResearchVaultEntry,
  metadata: SongPackageMetadata,
  skipCategories: Set<FactCategory>,
): Promise<CandidateFact[]> {
  const patternFacts = extractPatternFacts(vaultEntry.excerpt).filter(
    (f) => !skipCategories.has(f.category),
  );

  let modelFacts: RawExtractedFact[] = [];
  if (vaultEntry.excerpt.length >= 80) {
    try {
      const raw = await ollamaGenerate(
        buildFactExtractionPrompt({
          metadata,
          sourceLabel: vaultEntry.source,
          excerpt: vaultEntry.excerpt.slice(0, 4500),
          skipCategories: [...skipCategories],
        }),
        { format: "json", temperature: 0.1 },
      );
      const parsed = parseJsonFromModel<ModelFactOutput>(raw);
      const rows = extractArray<ModelFactRow>(parsed as unknown as Record<string, unknown>, ["facts"]);
      modelFacts = rows
        .filter((r) => VALID_CATEGORIES.has(r.category) && !skipCategories.has(r.category))
        .map((r) => ({
          factText: normalizeFactText(r.factText),
          category: r.category,
          excerptAnchor: r.excerptAnchor?.trim() ?? "",
          confidence: Math.min(1, Math.max(0, r.confidence ?? 0.7)),
        }));
    } catch {
      /* pattern-only fallback */
    }
  }

  const candidates: CandidateFact[] = [];
  for (const raw of patternFacts) {
    const fact = toCandidateFact(raw, vaultEntry, metadata, "pattern_extract");
    if (fact) candidates.push(fact);
  }
  for (const raw of modelFacts) {
    const fact = toCandidateFact(raw, vaultEntry, metadata, "model_extract");
    if (fact) candidates.push(fact);
  }
  return candidates;
}

/** Extract enrichment facts from external sources only — canon is locked separately. */
export async function extractAllCandidateFacts(input: {
  metadata: SongPackageMetadata;
  researchVault: ResearchVaultEntry[];
  canonicalFacts: CandidateFact[];
}): Promise<CandidateFact[]> {
  const skipCategories = new Set<FactCategory>();
  if (input.metadata.peakHot100 != null) skipCategories.add("chart");
  if (input.metadata.albumTitle) skipCategories.add("album");
  if (input.metadata.tags.length > 0) skipCategories.add("trivia");

  const externalEntries = input.researchVault.filter(isExternalVaultEntry);
  const extracted: CandidateFact[] = [];

  for (const entry of externalEntries) {
    const batch = await extractFactsFromExcerpt(entry, input.metadata, skipCategories);
    extracted.push(...batch);
  }

  const canonicalTexts = new Set(
    input.canonicalFacts.map((f) => f.factText.toLowerCase()),
  );

  const filtered = extracted.filter((f) => {
    const lower = f.factText.toLowerCase();
    for (const c of canonicalTexts) {
      if (lower.includes(c) || c.includes(lower)) return false;
    }
    return true;
  });

  return dedupeCandidateFacts([...input.canonicalFacts, ...filtered]);
}

export function dedupeCandidateFacts(facts: CandidateFact[]): CandidateFact[] {
  const out: CandidateFact[] = [];
  for (const f of facts) {
    const norm = f.factText.toLowerCase();
    const dup = out.some((e) => {
      const a = e.factText.toLowerCase();
      return a === norm || (a.length > 20 && norm.length > 20 && (a.includes(norm) || norm.includes(a)));
    });
    if (!dup) out.push(f);
  }
  return out;
}
