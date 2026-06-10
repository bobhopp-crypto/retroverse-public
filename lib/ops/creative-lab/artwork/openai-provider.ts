import type { ArtworkGenerateOptions, ArtworkGenerateResult, ArtworkPromptContext } from "./types";

const DEFAULT_SIZE = "1024x1536";
const DEFAULT_QUALITY = "medium";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

export async function generateOpenAIArtwork(
  context: ArtworkPromptContext,
  options: ArtworkGenerateOptions = {},
): Promise<ArtworkGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const count = options.count ?? 4;
  const size = options.size ?? DEFAULT_SIZE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: context.prompt,
      n: count,
      size,
      quality,
      response_format: "b64_json",
    }),
  });

  const body = (await res.json()) as OpenAIImageResponse;
  console.log("[cl-artwork:openai] response", {
    ok: res.ok,
    status: res.status,
    dataCount: body.data?.length ?? 0,
    hasB64: body.data?.some((row) => Boolean(row.b64_json)) ?? false,
    error: body.error?.message,
  });
  if (!res.ok) {
    throw new Error(body.error?.message ?? `OpenAI image API failed (${res.status})`);
  }

  const images = (body.data ?? [])
    .map((row, i) => {
      if (!row.b64_json) return null;
      return {
        index: i + 1,
        buffer: Buffer.from(row.b64_json, "base64"),
        mimeType: "image/png" as const,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (!images.length) {
    throw new Error("OpenAI returned no image data");
  }

  return { provider: "openai", images };
}
