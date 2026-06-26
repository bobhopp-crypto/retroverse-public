/** Local Ollama client — Qwen3 8B default, no cloud dependency.
 *
 * Intelligence pipeline entry point. New Studio worker code should prefer
 * `requestStudioAi()` from `@/lib/ops/studio/workers/ai-request`.
 */

export type OllamaGenerateOptions = {
  model?: string;
  temperature?: number;
  format?: "json";
  numPredict?: number;
};

const DEFAULT_MODEL = process.env.INTELLIGENCE_OLLAMA_MODEL?.trim() || "qwen3:8b";
const OLLAMA_BASE = process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";

export function intelligenceModel(): string {
  return DEFAULT_MODEL;
}

export async function ollamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Strip Qwen3 thinking blocks from response. */
export function stripThinking(text: string): string {
  return text.replace(/[\s\S]*?<\/think>/gi, "").trim();
}

export async function ollamaGenerate(
  prompt: string,
  options: OllamaGenerateOptions = {},
): Promise<string> {
  const model = options.model ?? DEFAULT_MODEL;
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: options.format,
      options: {
        temperature: options.temperature ?? 0.4,
        num_predict: options.numPredict ?? 4096,
      },
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama generate failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { response?: string };
  const raw = data.response?.trim() ?? "";
  return stripThinking(raw);
}

export function parseJsonFromModel<T>(text: string): T {
  const cleaned = stripThinking(text);
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence?.[1]?.trim() ?? cleaned;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  }
  const arrStart = candidate.indexOf("[");
  const arrEnd = candidate.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    return JSON.parse(candidate.slice(arrStart, arrEnd + 1)) as T;
  }
  throw new Error("Model did not return parseable JSON");
}
