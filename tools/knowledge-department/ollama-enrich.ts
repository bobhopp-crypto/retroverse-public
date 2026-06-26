import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ollamaAvailable, ollamaGenerate, parseJsonFromModel } from "../../lib/ops/intelligence/ollama-client.ts";
import type { Confidence, MarkdownRecord, OllamaEnrichment } from "./types.ts";

const ENRICHMENT_PROMPT = `You analyze Retroverse project documentation. Return ONLY valid JSON with these fields:
{
  "summary": "2-3 sentence factual summary of this document",
  "majorTopics": ["topic1", "topic2"],
  "importantDecisions": ["decision or conclusion stated in doc"],
  "openQuestions": ["unresolved question if any"],
  "confidence": "high|medium|low"
}

Rules:
- Be factual. Do not invent dates, people, or decisions not in the text.
- If no decisions or open questions exist, use empty arrays.
- confidence reflects how complete/actionable the document is.

Document path: {{PATH}}
Project context: {{PROJECT}}

---
{{CONTENT}}
---`;

export async function enrichRecordWithOllama(
  root: string,
  record: MarkdownRecord,
): Promise<MarkdownRecord> {
  const available = await ollamaAvailable();
  if (!available) return record;

  let content: string;
  try {
    content = await readFile(join(root, record.relativePath), "utf8");
  } catch {
    return record;
  }

  const truncated =
    content.length > 8000
      ? content.slice(0, 8000) + "\n\n[... truncated for analysis ...]"
      : content;

  const prompt = ENRICHMENT_PROMPT.replace("{{PATH}}", record.relativePath)
    .replace("{{PROJECT}}", record.primaryProject)
    .replace("{{CONTENT}}", truncated);

  try {
    const raw = await ollamaGenerate(prompt, {
      format: "json",
      temperature: 0.2,
      numPredict: 1024,
    });
    const parsed = parseJsonFromModel<OllamaEnrichment>(raw);

    return {
      ...record,
      summary: parsed.summary || record.summary,
      majorTopics: parsed.majorTopics?.length ? parsed.majorTopics : record.majorTopics,
      importantDecisions: parsed.importantDecisions?.length
        ? parsed.importantDecisions
        : record.importantDecisions,
      openQuestions: parsed.openQuestions?.length ? parsed.openQuestions : record.openQuestions,
      confidence: (parsed.confidence as Confidence) ?? record.confidence,
      enrichedByOllama: true,
    };
  } catch {
    return record;
  }
}

export async function synthesizeExecutiveSummary(
  indexSummary: {
    projectCounts: Record<string, number>;
    topTopics: string[];
    sampleDecisions: string[];
    timelineHighlights: string[];
    graphHighlights: string[];
  },
): Promise<string> {
  const available = await ollamaAvailable();
  if (!available) return "";

  const prompt = `You are writing an executive summary for the Retroverse Knowledge Department bootstrap.
This is a documentary outline, NOT a book. Be concise and factual.

Use ONLY the evidence provided. Do not invent dates or projects.

Evidence:
${JSON.stringify(indexSummary, null, 2)}

Write markdown with these sections:
## Major Projects Discovered
## Recurring Themes
## Architectural Evolution
## Abandoned or Paused Ideas
## Recurring Problems
## Recurring Successes
## Interesting Observations

Keep each section to 3-6 bullet points max.`;

  try {
    return await ollamaGenerate(prompt, { temperature: 0.3, numPredict: 4096 });
  } catch {
    return "";
  }
}
