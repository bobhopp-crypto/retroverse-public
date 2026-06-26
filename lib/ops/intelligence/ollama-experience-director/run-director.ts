import {
  intelligenceModel,
  ollamaAvailable,
  ollamaGenerate,
  parseJsonFromModel,
} from "@/lib/ops/intelligence/ollama-client";

import { buildDirectorPrompt } from "./prompt";
import type { DirectorRunResult, DirectorSongInput, DirectorSongOutput } from "./types";

const MAX_CHAPTERS = 5;
const MAX_SHELVES = 3;
const MAX_RETRIES = 2;
const DIRECTOR_NUM_PREDICT = 8192;
const VALID_READINESS = new Set(["ready", "needs_more_research", "not_ready"]);
const VALID_CHAPTER_TYPES = new Set([
  "story",
  "chart",
  "video",
  "album",
  "artist",
  "discovery",
]);

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function sanitizeOutput(raw: DirectorSongOutput, input: DirectorSongInput): DirectorSongOutput {
  const chapters = (raw.chapters ?? [])
    .filter((c) => c && typeof c.title === "string" && typeof c.body === "string")
    .slice(0, MAX_CHAPTERS)
    .map((c) => ({
      type: VALID_CHAPTER_TYPES.has(c.type) ? c.type : ("story" as const),
      title: c.title.trim(),
      body: c.body.trim(),
      whyIncluded: (c.whyIncluded ?? "").trim(),
      sourceMaterial: asStringArray(c.sourceMaterial),
    }));

  const discoveryShelves = (raw.discoveryShelves ?? [])
    .filter((s) => s && typeof s.title === "string")
    .slice(0, MAX_SHELVES)
    .map((s) => ({
      title: s.title.trim(),
      items: asStringArray(s.items),
      whyThisShelfMatters: (s.whyThisShelfMatters ?? "").trim(),
    }));

  const publicReadiness = VALID_READINESS.has(raw.publicReadiness)
    ? raw.publicReadiness
    : "needs_more_research";

  return {
    rvtr: input.rvtr,
    title: input.title,
    artist: input.artist,
    publicReadiness,
    bestAngle: (raw.bestAngle ?? "").trim(),
    omitReasons: asStringArray(raw.omitReasons),
    heroNote: (raw.heroNote ?? "").trim(),
    chapters,
    discoveryShelves,
    doNotShow: asStringArray(raw.doNotShow),
    missingData: asStringArray(raw.missingData),
    qualityNotes: asStringArray(raw.qualityNotes),
    recommendedNextResearch: asStringArray(raw.recommendedNextResearch),
  };
}

function containsMarkdownArtifacts(text: string): boolean {
  return /```/.test(text) || /^\s*#+\s/m.test(text);
}

function validateOutput(output: DirectorSongOutput): string[] {
  const issues: string[] = [];
  if (output.chapters.length > MAX_CHAPTERS) {
    issues.push(`truncated chapters to ${MAX_CHAPTERS}`);
  }
  if (output.discoveryShelves.length > MAX_SHELVES) {
    issues.push(`truncated shelves to ${MAX_SHELVES}`);
  }
  const allText = [
    output.bestAngle,
    output.heroNote,
    ...output.chapters.map((c) => `${c.title} ${c.body}`),
  ].join("\n");
  if (containsMarkdownArtifacts(allText)) {
    issues.push("markdown artifacts detected in output copy");
  }
  if (/\bRVTR\d{6}\b/i.test(allText)) {
    issues.push("RVTR leaked into public copy");
  }
  return issues;
}

function parseDirectorJson(text: string): DirectorSongOutput {
  try {
    return parseJsonFromModel<DirectorSongOutput>(text);
  } catch (firstErr) {
    const cleaned = text.replace(/[\s\S]*?<\/think>/gi, "").trim();
    const start = cleaned.indexOf("{");
    if (start < 0) throw firstErr;
    let slice = cleaned.slice(start);
    for (let end = slice.lastIndexOf("}"); end > start; end = slice.lastIndexOf("}", end - 1)) {
      try {
        return JSON.parse(slice.slice(0, end + 1)) as DirectorSongOutput;
      } catch {
        continue;
      }
    }
    throw firstErr;
  }
}

/** Run Ollama director for one song. */
export async function runDirectorForSong(input: DirectorSongInput): Promise<DirectorRunResult> {
  const ranAt = new Date().toISOString();
  const model = intelligenceModel();

  const available = await ollamaAvailable();
  if (!available) {
    return {
      rvtr: input.rvtr,
      ok: false,
      output: null,
      error: "Ollama not available at localhost:11434 — start with: ollama serve",
      model,
      ranAt,
    };
  }

  const prompt = buildDirectorPrompt(input);
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await ollamaGenerate(prompt, {
        format: "json",
        temperature: attempt === 1 ? 0.2 : 0.1,
        numPredict: DIRECTOR_NUM_PREDICT,
      });
      const parsed = parseDirectorJson(raw);
      const output = sanitizeOutput(parsed, input);
      const validationIssues = validateOutput(output);
      if (validationIssues.length > 0) {
        output.qualityNotes = [...output.qualityNotes, ...validationIssues.map((i) => `[validation] ${i}`)];
      }
      return { rvtr: input.rvtr, ok: true, output, error: null, model, ranAt };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        console.warn(`    retry ${attempt + 1}/${MAX_RETRIES} after parse error`);
      }
    }
  }

  return {
    rvtr: input.rvtr,
    ok: false,
    output: null,
    error: lastError,
    model,
    ranAt,
  };
}

/** Run director for all pilot songs sequentially. */
export async function runDirectorBatch(
  inputs: DirectorSongInput[],
): Promise<DirectorRunResult[]> {
  const results: DirectorRunResult[] = [];
  for (const input of inputs) {
    console.log(`  Director: ${input.artist} — ${input.title} (${input.rvtr})`);
    const result = await runDirectorForSong(input);
    results.push(result);
    if (result.ok) {
      console.log(`    → ${result.output?.publicReadiness} | ${result.output?.chapters.length ?? 0} chapters`);
    } else {
      console.error(`    ✗ ${result.error}`);
    }
  }
  return results;
}
