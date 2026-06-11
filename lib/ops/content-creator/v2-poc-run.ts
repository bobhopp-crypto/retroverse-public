import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { generateArtwork, resolveArtworkProvider } from "@/lib/ops/creative-lab/artwork";
import type { ArtworkPromptContext } from "@/lib/ops/creative-lab/artwork/types";
import { renderPassArtworkPrompt } from "@/lib/ops/creative-lab/pass-artwork-prompt";
import { compositePassDataOverlay } from "@/lib/ops/creative-lab/pass-data-overlay";
import { verifyQrInComposite } from "@/lib/ops/creative-lab/pass-export-composite";
import { renderPassConceptPrompt } from "@/lib/ops/creative-lab/pass-concept-prompt";
import { creativeLabV2PocRunDir } from "@/lib/ops/creative-lab/paths";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import { visualWorldById, type VisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";

export type V2PocInput = {
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  passTypeLabel?: string;
  qrUrl: string;
  visualWorldId: VisualWorldId;
};

export type V2PocArtifact = {
  id: string;
  label: string;
  filename: string;
  path: string;
  group: "v1" | "v2-artwork" | "v2-composite";
  side: "front" | "back";
};

export type V2PocResult = {
  runId: string;
  runDir: string;
  provider: string;
  artifacts: V2PocArtifact[];
  exportZipFilename: string;
  qrVerification: Awaited<ReturnType<typeof verifyQrInComposite>> | null;
  startedAt: string;
  completedAt: string;
};

function artworkContext(prompt: string, worldId: VisualWorldId): ArtworkPromptContext {
  const world = visualWorldById(worldId);
  return {
    prompt,
    artifactTypeId: "vip-pass",
    event: "",
    venue: "",
    date: "",
    featuredYears: [],
    module: "pass-lab",
    artDirectionTitle: world.title,
    treatmentLabel: "v2-poc",
  };
}

async function writePng(dir: string, filename: string, buffer: Buffer): Promise<string> {
  const path = join(dir, filename);
  await writeFile(path, buffer);
  return path;
}

export async function runV2PocComparison(input: V2PocInput): Promise<V2PocResult> {
  const runId = `poc-${Date.now().toString(36)}`;
  const runDir = creativeLabV2PocRunDir(runId);
  await mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const fields = {
    event: input.event,
    venue: input.venue,
    date: input.date,
    featuredYears: input.featuredYears,
    passTypeLabel: normalizePassTypeLabel(input.passTypeLabel),
    qrUrl: input.qrUrl,
  };

  const artifacts: V2PocArtifact[] = [];

  // —— v1 baseline: AI generates complete credential (text in image) ——
  const v1Prompt = renderPassConceptPrompt({
    worldId: input.visualWorldId,
    event: input.event,
    venue: input.venue,
    date: input.date,
    featuredYears: input.featuredYears,
    passTypeLabel: fields.passTypeLabel,
    conceptKey: "A",
  });

  const v1Result = await generateArtwork(artworkContext(v1Prompt, input.visualWorldId), {
    count: 1,
    quality: "medium",
    size: "1024x1536",
  });
  const v1Image = v1Result.images[0];
  if (!v1Image) throw new Error("v1 front generation failed");

  const v1Path = await writePng(runDir, "v1-front.png", v1Image.buffer);
  artifacts.push({
    id: "v1-front",
    label: "v1 — AI complete credential",
    filename: "v1-front.png",
    path: v1Path,
    group: "v1",
    side: "front",
  });

  // —— v2 artwork front ——
  const artworkFrontPrompt = renderPassArtworkPrompt({
    worldId: input.visualWorldId,
    side: "front",
    conceptKey: "A",
  });
  const artFrontResult = await generateArtwork(artworkContext(artworkFrontPrompt, input.visualWorldId), {
    count: 1,
    quality: "medium",
    size: "1024x1536",
  });
  const artFront = artFrontResult.images[0];
  if (!artFront) throw new Error("v2 artwork front generation failed");

  const artFrontPath = await writePng(runDir, "v2-artwork-front.png", artFront.buffer);
  artifacts.push({
    id: "v2-artwork-front",
    label: "v2 — Artwork layer (front)",
    filename: "v2-artwork-front.png",
    path: artFrontPath,
    group: "v2-artwork",
    side: "front",
  });

  const compositeFront = await compositePassDataOverlay({
    artworkPng: artFront.buffer,
    side: "front",
    fields,
    visualWorldId: input.visualWorldId,
  });
  const compositeFrontPath = await writePng(runDir, "v2-composite-front.png", compositeFront);
  artifacts.push({
    id: "v2-composite-front",
    label: "v2 Phase 1 — Credential layout (front)",
    filename: "v2-composite-front.png",
    path: compositeFrontPath,
    group: "v2-composite",
    side: "front",
  });

  // —— v2 artwork back + composite (with QR) ——
  const artworkBackPrompt = renderPassArtworkPrompt({
    worldId: input.visualWorldId,
    side: "back",
    conceptKey: "A",
  });
  const artBackResult = await generateArtwork(
    artworkContext(artworkBackPrompt, input.visualWorldId),
    { count: 1, quality: "medium", size: "1024x1536", referenceImage: artFront.buffer },
  );
  const artBack = artBackResult.images[0];
  if (!artBack) throw new Error("v2 artwork back generation failed");

  const artBackPath = await writePng(runDir, "v2-artwork-back.png", artBack.buffer);
  artifacts.push({
    id: "v2-artwork-back",
    label: "v2 — Artwork layer (back)",
    filename: "v2-artwork-back.png",
    path: artBackPath,
    group: "v2-artwork",
    side: "back",
  });

  const compositeBack = await compositePassDataOverlay({
    artworkPng: artBack.buffer,
    side: "back",
    fields,
    visualWorldId: input.visualWorldId,
  });
  const compositeBackPath = await writePng(runDir, "v2-composite-back.png", compositeBack);
  artifacts.push({
    id: "v2-composite-back",
    label: "v2 Phase 1 — Credential layout + QR (back)",
    filename: "v2-composite-back.png",
    path: compositeBackPath,
    group: "v2-composite",
    side: "back",
  });

  const qrVerification = await verifyQrInComposite(compositeBackPath, input.qrUrl);

  // —— v2 export package (single path: composites only) ——
  const exportZipFilename = "v2-poc-export.zip";
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const staging = join(runDir, "_export-staging");
  await mkdir(staging, { recursive: true });
  await writeFile(join(staging, "v2-composite-front.png"), compositeFront);
  await writeFile(join(staging, "v2-composite-back.png"), compositeBack);
  await writeFile(
    join(staging, "v2-poc-report.json"),
    `${JSON.stringify(
      {
        runId,
        mode: "v2-phase1-zone-layout",
        fields,
        visualWorldId: input.visualWorldId,
        qrVerification,
        artifacts: artifacts.map((a) => ({ id: a.id, label: a.label, filename: a.filename })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (process.platform === "darwin") {
    await execFileAsync("zip", ["-r", join(runDir, exportZipFilename), "."], { cwd: staging });
  } else {
    await writeFile(
      join(runDir, exportZipFilename),
      "ZIP requires macOS zip CLI\n",
      "utf8",
    );
  }

  const completedAt = new Date().toISOString();

  return {
    runId,
    runDir,
    provider: resolveArtworkProvider(),
    artifacts,
    exportZipFilename,
    qrVerification,
    startedAt,
    completedAt,
  };
}

export function v2PocFileUrl(runId: string, filename: string): string {
  return `/api/ops/content-creator/v2-poc/files/${encodeURIComponent(runId)}/${encodeURIComponent(filename)}`;
}
