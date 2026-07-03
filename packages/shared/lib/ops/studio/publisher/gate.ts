import "server-only";

import { access } from "fs/promises";

import { isMuseumPilotRvtr } from "@/lib/retroverse/renderer/museum-pilot-registry";
import { directorRenderSpecPath } from "@/lib/studio/package";
import { normalizeRvtr } from "@/lib/studio/status";

import { getPublisherRecord, isPublisherApproved } from "./store";

/** Patron-facing experiences require Publisher approval. Ops previews bypass this gate. */
export async function isExperiencePublished(rvtr: string): Promise<boolean> {
  const record = await getPublisherRecord(rvtr);
  return isPublisherApproved(record);
}

export type ExperiencePublicationBlock =
  | { kind: "published" }
  | { kind: "unpublished"; rvtr: string }
  | { kind: "not_ready" }
  | { kind: "invalid_rvtr" };

/** Why a patron `/experience/{RVTR}` request did not render (gate does not call notFound). */
export async function resolveExperiencePublicationBlock(
  rvtr: string,
): Promise<ExperiencePublicationBlock> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return { kind: "invalid_rvtr" };

  if (await isExperiencePublished(normalized)) {
    return { kind: "published" };
  }

  if (await isMuseumPilotRvtr(normalized)) {
    return { kind: "unpublished", rvtr: normalized };
  }

  try {
    await access(directorRenderSpecPath(normalized));
    return { kind: "unpublished", rvtr: normalized };
  } catch {
    return { kind: "not_ready" };
  }
}
