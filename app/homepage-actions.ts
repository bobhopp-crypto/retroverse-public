"use server";

import {
  loadHomepageDocument,
} from "@/lib/home/load-homepage-document";
import type { HomepageDocumentModel } from "@/lib/home/homepage-document-types";
import { resolveHomepageRvtr, type HomepageRvtrResolution } from "@/lib/home/homepage-rvtr";

export async function fetchHomepagePackage(
  manualRvtr?: string | null,
): Promise<{ resolution: HomepageRvtrResolution; model: HomepageDocumentModel | null }> {
  const resolution = await resolveHomepageRvtr(manualRvtr ?? null);
  const model = resolution.rvtr ? await loadHomepageDocument(resolution.rvtr) : null;
  return { resolution, model };
}

export async function fetchHomepageDocumentByRvtr(
  rvtr: string,
): Promise<HomepageDocumentModel | null> {
  return loadHomepageDocument(rvtr);
}
