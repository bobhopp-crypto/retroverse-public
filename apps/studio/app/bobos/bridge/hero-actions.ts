"use server";

import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import { loadBridgeView } from "@/lib/bobos/bridge/load-bridge-view";
import type { BridgeSongModel } from "@/lib/bobos/bridge/types";
import {
  assignPrimaryHeroFromFile,
  buildHeroPromptFromPackage,
  createHeroRequest,
  loadHeroRequest,
} from "@/lib/bobos/hero";
import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import {
  loadSongPackage,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

import type { HeroRequest } from "@/lib/bobos/hero/types";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Hero Generator is localhost-only.");
  }
}

export type HeroGeneratorState = {
  prompt: string;
  request: HeroRequest | null;
};

export async function fetchHeroGeneratorState(rvtrParam: string): Promise<HeroGeneratorState | null> {
  assertLocalStudio();
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  const raw = await loadSongPackage(rvtr);
  if (!raw) return null;

  const pkg = hydratePackageIntel(raw);
  const request = await loadHeroRequest(rvtr);

  return {
    prompt: request?.prompt ?? buildHeroPromptFromPackage(pkg),
    request,
  };
}

export async function submitHeroRequest(
  rvtrParam: string,
  prompt: string,
): Promise<{ request: HeroRequest; model: BridgeSongModel | null }> {
  assertLocalStudio();
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) throw new Error("Valid RVTR required.");

  const request = await createHeroRequest(rvtr, prompt);
  revalidatePath("/bobos/bridge");
  const model = await loadBridgeView(rvtr);
  return { request, model };
}

export async function assignHeroFromLocalPath(
  rvtrParam: string,
  localPath: string,
): Promise<{ request: HeroRequest; model: BridgeSongModel | null }> {
  assertLocalStudio();
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) throw new Error("Valid RVTR required.");

  const { request } = await assignPrimaryHeroFromFile(rvtr, localPath.trim());
  revalidatePath("/bobos/bridge");
  const model = await loadBridgeView(rvtr);
  return { request, model };
}

export async function assignHeroFromUpload(
  rvtrParam: string,
  formData: FormData,
): Promise<{ request: HeroRequest; model: BridgeSongModel | null }> {
  assertLocalStudio();
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) throw new Error("Valid RVTR required.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a portrait image file.");
  }

  const ext = file.name.toLowerCase().endsWith(".png") ? ".png" : ".jpg";
  const tempPath = join(tmpdir(), `bobos-hero-${rvtr}-${Date.now()}${ext}`);
  await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

  const { request } = await assignPrimaryHeroFromFile(rvtr, tempPath);
  revalidatePath("/bobos/bridge");
  const model = await loadBridgeView(rvtr);
  return { request, model };
}
