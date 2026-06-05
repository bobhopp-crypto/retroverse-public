"use client";

import type { ClipTagSuggestion } from "@/lib/ops/media-lab/editorial/transcript-suggestions";
import { parseTypedTitle } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

import { curatorLabelForContentType } from "./curator-categories";

function humanizeReasons(reasons: string[]): string {
  if (reasons.length === 0) {
    return "Based on transcript and clip context.";
  }

  const lines: string[] = [];
  for (const raw of reasons) {
    const r = raw.trim();
    if (!r || /^[A-Z]{2,}(\s+[A-Z]{2,})+$/.test(r)) continue;
    if (/station\s*id|call\s*letters|network\s*ident/i.test(r)) {
      lines.push("Mentions station identification language in transcript.");
      continue;
    }
    if (/brand detected/i.test(r)) {
      lines.push("Brand or product name detected in transcript.");
      continue;
    }
    if (/ocr/i.test(r)) {
      lines.push("On-screen text supports this category.");
      continue;
    }
    if (/lead-in/i.test(r)) {
      lines.push("Opening context suggests this category.");
      continue;
    }
    if (/no in-clip transcript/i.test(r)) {
      lines.push("Limited transcript in this clip — review the video.");
      continue;
    }
    lines.push(
      r
        .replace(/^Clip:\s*/i, "")
        .replace(/^Context:\s*/i, "Nearby context: ")
        .replace(/^OCR on-screen:\s*/i, "On-screen text: "),
    );
  }

  const unique = [...new Set(lines)];
  return unique[0] ?? "Based on transcript and clip context.";
}

type AiSuggestionPanelProps = {
  suggestion: ClipTagSuggestion | null;
  onAccept: () => void;
};

export function AiSuggestionPanel(props: AiSuggestionPanelProps) {
  const suggestion = props.suggestion;
  if (!suggestion) {
    return (
      <div className="ops-ml-ai-suggest">
        <h3 className="ops-ml-ai-suggest__head">AI suggestion</h3>
        <p className="ops-ml-ai-suggest__empty">No suggestion for this clip yet.</p>
      </div>
    );
  }

  const parsed = parseTypedTitle(suggestion.title);
  const suggestedTitle =
    suggestion.subject?.trim() ||
    parsed.subject ||
    suggestion.title.replace(/^[A-Za-z\s]+-\s*/, "").trim();
  const categoryLabel = curatorLabelForContentType(suggestion.type);

  return (
    <div className="ops-ml-ai-suggest">
      <h3 className="ops-ml-ai-suggest__head">AI suggestion</h3>
      <dl className="ops-ml-ai-suggest__fields">
        <div>
          <dt>Suggested category</dt>
          <dd>{categoryLabel}</dd>
        </div>
        <div>
          <dt>Suggested title</dt>
          <dd>{suggestedTitle}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{suggestion.confidence}%</dd>
        </div>
        <div>
          <dt>Reason</dt>
          <dd>{humanizeReasons(suggestion.reasons)}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="ops-btn ops-ml-ai-suggest__accept"
        title="Use the AI-generated title."
        onClick={() => props.onAccept()}
      >
        Accept suggestion <span className="ops-ml-deck__key">A</span>
      </button>
    </div>
  );
}
