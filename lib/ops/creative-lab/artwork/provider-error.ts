import type { ArtworkProviderId } from "./types";

export type ProviderErrorDetail = {
  provider: ArtworkProviderId | string;
  model: string;
  httpStatus: number;
  providerMessage: string;
  endpoint: string;
  code?: string;
  type?: string;
};

export class ArtworkProviderError extends Error {
  readonly detail: ProviderErrorDetail;

  constructor(detail: ProviderErrorDetail) {
    super(detail.providerMessage);
    this.name = "ArtworkProviderError";
    this.detail = detail;
  }
}

export function extractProviderErrorDetail(error: unknown): ProviderErrorDetail | null {
  if (error instanceof ArtworkProviderError) return error.detail;
  return null;
}

export function artworkErrorJson(error: unknown): {
  error: string;
  providerError?: ProviderErrorDetail;
} {
  const detail = extractProviderErrorDetail(error);
  const message = error instanceof Error ? error.message : "artwork_failed";
  return detail ? { error: message, providerError: detail } : { error: message };
}

export function formatProviderErrorSummary(detail: ProviderErrorDetail): string {
  return [
    `Provider: ${detail.provider}`,
    `Model: ${detail.model}`,
    `HTTP ${detail.httpStatus}`,
    detail.providerMessage,
  ].join(" · ");
}
