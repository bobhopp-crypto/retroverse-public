import { ArtworkProviderError } from "./provider-error";
import type { ArtworkGenerateOptions, ArtworkGenerateResult, ArtworkPromptContext } from "./types";

const DEFAULT_SIZE = "1024x1536";
const DEFAULT_QUALITY = "medium";
const GENERATIONS_ENDPOINT = "https://api.openai.com/v1/images/generations";
const EDITS_ENDPOINT = "https://api.openai.com/v1/images/edits";
const IMAGE_MODEL = "gpt-image-2";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string; type?: string; code?: string; param?: string | null };
};

function throwOpenAIProviderError(
  endpoint: string,
  httpStatus: number,
  body: OpenAIImageResponse,
): never {
  const providerMessage = body.error?.message ?? `OpenAI image API failed (${httpStatus})`;
  throw new ArtworkProviderError({
    provider: "openai",
    model: IMAGE_MODEL,
    httpStatus,
    providerMessage,
    endpoint,
    code: body.error?.code,
    type: body.error?.type,
  });
}

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

  const res = await fetch(GENERATIONS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: context.prompt,
      n: count,
      size,
      quality,
      output_format: "png",
    }),
  });

  const body = (await res.json()) as OpenAIImageResponse;
  console.log("[cl-artwork:openai] response", {
    ok: res.ok,
    status: res.status,
    model: IMAGE_MODEL,
    endpoint: GENERATIONS_ENDPOINT,
    dataCount: body.data?.length ?? 0,
    hasB64: body.data?.some((row) => Boolean(row.b64_json)) ?? false,
    error: body.error?.message,
    code: body.error?.code,
    type: body.error?.type,
  });
  if (!res.ok) {
    throwOpenAIProviderError(GENERATIONS_ENDPOINT, res.status, body);
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

/** Generate with front reference — tries edits API, falls back to text-only generations. */
export async function generateOpenAIArtworkFromReference(
  context: ArtworkPromptContext,
  referencePng: Buffer,
  options: ArtworkGenerateOptions = {},
): Promise<ArtworkGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const size = options.size ?? DEFAULT_SIZE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  const form = new FormData();
  form.append("model", IMAGE_MODEL);
  form.append("prompt", context.prompt);
  form.append(
    "image",
    new Blob([new Uint8Array(referencePng)], { type: "image/png" }),
    "front.png",
  );
  form.append("size", size);
  form.append("quality", quality);
  form.append("n", "1");
  form.append("output_format", "png");

  const res = await fetch(EDITS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const body = (await res.json()) as OpenAIImageResponse;
  console.log("[cl-artwork:openai:edit] response", {
    ok: res.ok,
    status: res.status,
    model: IMAGE_MODEL,
    endpoint: EDITS_ENDPOINT,
    dataCount: body.data?.length ?? 0,
    error: body.error?.message,
    code: body.error?.code,
    type: body.error?.type,
  });

  if (res.ok && body.data?.length) {
    const images = body.data
      .map((row, i) => {
        if (!row.b64_json) return null;
        return {
          index: i + 1,
          buffer: Buffer.from(row.b64_json, "base64"),
          mimeType: "image/png" as const,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
    if (images.length) {
      return { provider: "openai", images };
    }
  }

  console.warn("[cl-artwork:openai:edit] falling back to generations", body.error?.message);
  const fallbackPrompt = [
    context.prompt,
    ``,
    `STYLE MATCH CRITICAL: This is the REVERSE of the approved front laminate shown in the reference.`,
    `Mirror the front's palette (${context.artDirectionTitle ?? "visual world"}), typography, border language, and laminate stock.`,
    `The back must feel like flipping the same physical pass over — not a new design.`,
  ].join("\n");

  return generateOpenAIArtwork({ ...context, prompt: fallbackPrompt }, { ...options, count: 1 });
}
