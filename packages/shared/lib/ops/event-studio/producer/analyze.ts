import { parseJsonFromModel, stripThinking } from "@/lib/ops/intelligence/ollama-client";

import {
  EVENT_PRODUCER_DEFAULT_MODEL,
  EVENT_PRODUCER_OLLAMA_URL,
} from "./defaults";
import { normalizeParsedPlan } from "./normalize";
import type { EventProducerParsedPlan } from "./types";

const PARSED_PLAN_SCHEMA = `{
  "eventTitle": "",
  "eventType": "",
  "seriesName": "",
  "venue": "",
  "dateSummary": "",
  "dates": [],
  "startTime": "",
  "endTime": "",
  "theme": "",
  "musicEra": [],
  "expectedAttendance": null,
  "registration": {
    "enabled": false,
    "required": false,
    "rules": ""
  },
  "passes": {
    "enabled": false,
    "standardPasses": true,
    "premiumPasses": false,
    "premiumPerSheet": 0,
    "paperSize": ""
  },
  "giveaway": {
    "enabled": false,
    "prize": "",
    "mustBePresent": null,
    "drawDate": "",
    "rules": ""
  },
  "recommendedModules": {
    "identity": true,
    "assets": true,
    "passes": false,
    "giveaway": false,
    "landingPage": false,
    "poster": false,
    "facebookPost": false,
    "nowPlaying": false,
    "archive": true
  },
  "missingQuestions": [],
  "needsReview": []
}`;

function buildPrompt(sourceText: string): string {
  return `You are an event production intake assistant for Retroverse Event Studio.

Extract facts ONLY from the event description below. Do not invent dates, times, venue, prizes, attendance, or rules that are not stated or clearly implied.

Rules:
- Use empty strings, empty arrays, false, or null when information is unknown.
- Do not guess missing details.
- Recommend Event Studio modules based on what the description mentions or clearly requires.
- Set recommendedModules.passes true when passes or collector passes are mentioned.
- Set recommendedModules.giveaway true when giveaways, prizes, or drawings are mentioned.
- Set recommendedModules.landingPage true when registration or public signup is mentioned.
- Set recommendedModules.poster, facebookPost, nowPlaying when those channels or formats are mentioned or strongly implied.
- Put unclear or ambiguous items in needsReview.
- Put important unanswered production questions in missingQuestions.
- Return valid JSON only. No markdown. No commentary. No code fences.

Return JSON matching this schema exactly:
${PARSED_PLAN_SCHEMA}

Event description:
"""
${sourceText.trim()}
"""`;
}

export type AnalyzeEventResult =
  | { ok: true; model: string; parsedPlan: EventProducerParsedPlan }
  | { ok: false; error: string; code: "ollama_unavailable" | "invalid_json" | "empty_input" };

export async function analyzeEventDescription(sourceText: string): Promise<AnalyzeEventResult> {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    return { ok: false, error: "Event description is required.", code: "empty_input" };
  }

  const model = EVENT_PRODUCER_DEFAULT_MODEL;

  let rawResponse: string;
  try {
    const res = await fetch(EVENT_PRODUCER_OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(trimmed),
        stream: false,
        format: "json",
        options: {
          temperature: 0.2,
          num_predict: 4096,
        },
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Ollama unavailable (${res.status}): ${body.slice(0, 160) || "connection failed"}`,
        code: "ollama_unavailable",
      };
    }

    const data = (await res.json()) as { response?: string };
    rawResponse = stripThinking(data.response?.trim() ?? "");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ollama request failed";
    return {
      ok: false,
      error: `Ollama unavailable: ${message}`,
      code: "ollama_unavailable",
    };
  }

  try {
    const parsed = parseJsonFromModel<unknown>(rawResponse);
    return {
      ok: true,
      model,
      parsedPlan: normalizeParsedPlan(parsed),
    };
  } catch {
    return {
      ok: false,
      error: "Ollama returned invalid JSON. Try again or save a basic draft without AI.",
      code: "invalid_json",
    };
  }
}
