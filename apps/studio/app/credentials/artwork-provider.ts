import {
  contextKey,
  type ArtworkPair,
  type CredentialFields,
  type CredentialTypeId,
} from "./model";

export type ArtworkProvider = {
  generatePair(
    fields: CredentialFields,
    credentialType: CredentialTypeId,
    signal?: AbortSignal,
    familySeed?: number,
  ): Promise<ArtworkPair>;
};

type GenerateResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  runId?: string;
  frontUrl?: string;
  backUrl?: string;
  generatedAt?: string;
};

export const credentialsArtworkProvider: ArtworkProvider = {
  async generatePair(fields, credentialType, signal, familySeed = Date.now()) {
    const response = await fetch("/api/bobos/credentials/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, credentialType, familySeed }),
      signal,
    });
    const result = (await response.json()) as GenerateResponse;
    if (!response.ok || !result.runId || !result.frontUrl || !result.backUrl) {
      throw new Error(result.message || result.error || "Artwork couldn’t be generated.");
    }
    const generatedAt = result.generatedAt ?? new Date().toISOString();
    const assetContext = contextKey(fields, credentialType);
    return {
      front: {
        id: `${result.runId}-front`,
        source: result.frontUrl,
        contextKey: assetContext,
        generatedAt,
        renderMode: "complete",
      },
      back: {
        id: `${result.runId}-back`,
        source: result.backUrl,
        contextKey: assetContext,
        generatedAt,
        renderMode: "complete",
      },
    };
  },
};
