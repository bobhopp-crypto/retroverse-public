import { readFile } from "fs/promises";
import { join } from "path";

import { creativeLabVNextRunDir } from "@/lib/ops/creative-lab/paths";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import { DEFAULT_CREATIVE_DIRECTION_SETTINGS } from "@/lib/ops/content-creator/creative-direction";
import { runVNextGenerate, type VNextManifest } from "@/lib/ops/content-creator/vnext-run";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

import { loadGenerationManifest } from "./index";

export type VariationResult = {
  batchId: string;
  parentId: string;
  runIds: string[];
};

/** Generate N variations — same era, direction, governed text; new composition seeds. */
export async function generateVariationsFromParent(args: {
  parentId: string;
  count: number;
  profile: RvbrProfile;
}): Promise<VariationResult> {
  const parent = await loadGenerationManifest(args.parentId);
  if (!parent) throw new Error("Parent generation not found");

  const batchId = `var-${Date.now().toString(36)}`;
  const runIds: string[] = [];

  let vnextManifest: VNextManifest | null = null;
  try {
    const raw = await readFile(join(creativeLabVNextRunDir(parent.runId), "manifest.json"), "utf8");
    vnextManifest = JSON.parse(raw) as VNextManifest;
  } catch {
    vnextManifest = null;
  }

  const creativeSettings = parent.creativeSettings ?? vnextManifest?.creativeSettings ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS;
  const frontFields = vnextManifest?.frontFields ?? {
    event: parent.event,
    venue: parent.venue,
    date: parent.date,
    secondaryLine: parent.secondaryLine,
    passTypeLabel: normalizePassTypeLabel(parent.passTypeLabel),
    qrUrl: parent.qrUrl,
  };
  const backFields = vnextManifest?.backFields ?? {
    ...frontFields,
    qrUrl: parent.qrUrl,
  };

  const capped = Math.min(Math.max(1, args.count), 10);

  for (let i = 0; i < capped; i++) {
    const manifest = await runVNextGenerate({
      profile: args.profile,
      artifact: parent.artifact,
      frontFields,
      backFields,
      creativeSettings,
      compositionSeed: Date.now() + i * 997,
      parentGenerationId: parent.id,
      variationBatchId: batchId,
    });
    runIds.push(manifest.runId);
  }

  return { batchId, parentId: parent.id, runIds };
}
