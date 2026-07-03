import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { generateArtwork, resolveArtworkProvider } from "@/lib/ops/creative-lab/artwork";
import type { ArtworkPromptContext } from "@/lib/ops/creative-lab/artwork/types";
import { creativeLabVNextRunDir } from "@/lib/ops/creative-lab/paths";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import {
  DEFAULT_CREATIVE_DIRECTION_SETTINGS,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import { resolveArtifactArchetype } from "@/lib/creative/artifact-archetypes";
import type { ComposedRvbrPrompt, RvbrStyleDirective } from "@/lib/creative/rvbr-prompt-types";
import { buildCollectorCardExportPackage, type CollectorCardExportPaths } from "@/lib/ops/content-creator/collector-card-export";
import type { CollectorCardContent, CollectorCardPresentation } from "@/lib/ops/content-creator/collector-card";
import {
  artDirectorPromptText,
  renderArtDirectorBackPrompt,
  renderArtDirectorFrontPrompt,
  type ArtDirectorFields,
} from "@/lib/ops/content-creator/rvbr-art-director-prompt";
import { buildVNextPrintPackage, type PrintPackagePaths } from "@/lib/ops/content-creator/print-package";
import type { QrExportStatus } from "@/lib/ops/content-creator/qr-export-status";
import {
  DEFAULT_PASS_NUMBERING,
  normalizePrintQuantity,
  type PassNumberingSettings,
} from "@/lib/ops/content-creator/pass-numbering";
import { syncGenerationFromVNext } from "@/lib/ops/content-creator/library";
import type { QrVerificationResult } from "@/lib/ops/creative-lab/pass-export-composite";
import { normalizeQrPlacement } from "@/lib/ops/creative-lab/pass-layout";
import type { PassQrPlacement } from "@/lib/ops/creative-lab/types";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type VNextInput = {
  profile: RvbrProfile;
  artifact: ContentArtifactType;
  frontFields: ArtDirectorFields;
  backFields: ArtDirectorFields;
  creativeSettings: CreativeDirectionSettings;
  /** When present, Style + Color Scheme lead the prompt (BobOS Pass Workspace). */
  styleDirective?: RvbrStyleDirective;
  compositionSeed?: number;
  parentGenerationId?: string;
  variationBatchId?: string;
};

export type VNextManifest = {
  runId: string;
  runDir: string;
  eraSlug: string;
  artifact: ContentArtifactType;
  frontFields: ArtDirectorFields;
  backFields: ArtDirectorFields;
  visualWorldId: string;
  provider: string;
  frontFilename: string;
  backFilename: string;
  serialNumber?: string;
  compositionSeed?: number;
  creativeSettings?: CreativeDirectionSettings;
  styleDirective?: RvbrStyleDirective;
  resolvedArtifactArchetype?: string;
  parentGenerationId?: string;
  variationBatchId?: string;
  promptInspector?: {
    front: ComposedRvbrPrompt;
    back: ComposedRvbrPrompt;
  };
  collectorCardContent?: CollectorCardContent;
  collectorCardPresentation?: CollectorCardPresentation;
  exportZipFilename?: string;
  quantity?: number;
  numbering?: PassNumberingSettings;
  printPackage?: PrintPackagePaths | CollectorCardExportPaths;
  qrPlacement?: PassQrPlacement;
  qrStatus?: QrExportStatus;
  qrVerification?: QrVerificationResult;
  startedAt: string;
  updatedAt: string;
};

function artworkContext(prompt: string, fields: ArtDirectorFields, profile: RvbrProfile): ArtworkPromptContext {
  return {
    prompt,
    artifactTypeId: "vip-pass",
    event: fields.event,
    venue: fields.venue,
    date: fields.date,
    secondaryLine: fields.secondaryLine,
    module: "pass-lab",
    artDirectionTitle: profile.name,
    treatmentLabel: "vnext-creator",
  };
}

function serialForRun(runId: string): string {
  return `RV-${runId.replace(/^vnext-/, "").toUpperCase().slice(0, 8)}`;
}

async function writeManifest(runDir: string, manifest: VNextManifest): Promise<void> {
  await writeFile(join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function loadVNextManifest(runId: string): Promise<VNextManifest> {
  const raw = await readFile(join(creativeLabVNextRunDir(runId), "manifest.json"), "utf8");
  return JSON.parse(raw) as VNextManifest;
}

async function writePng(runDir: string, filename: string, buffer: Buffer): Promise<void> {
  await writeFile(join(runDir, filename), buffer);
}

export async function runVNextGenerate(input: VNextInput): Promise<VNextManifest> {
  const runId = `vnext-${Date.now().toString(36)}`;
  const runDir = creativeLabVNextRunDir(runId);
  await mkdir(runDir, { recursive: true });

  const frontFields = {
    ...input.frontFields,
    passTypeLabel: normalizePassTypeLabel(input.frontFields.passTypeLabel),
  };
  const backFields = {
    ...input.backFields,
    passTypeLabel: normalizePassTypeLabel(input.backFields.passTypeLabel),
  };

  const compositionSeed = input.compositionSeed ?? Date.now();
  const creativeSettings = input.creativeSettings ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS;
  const frontComposed = renderArtDirectorFrontPrompt(
    input.profile,
    frontFields,
    compositionSeed,
    creativeSettings,
    input.artifact,
    input.styleDirective,
  );
  const frontResult = await generateArtwork(
    artworkContext(artDirectorPromptText(frontComposed), frontFields, input.profile),
    {
    count: 1,
    quality: "medium",
    size: "1024x1536",
  });
  const frontImage = frontResult.images[0];
  if (!frontImage) throw new Error("Front generation failed");

  const frontFilename = "front.png";
  await writePng(runDir, frontFilename, frontImage.buffer);

  const backFilename = "back.png";
  let backComposed: ComposedRvbrPrompt;
  if (input.artifact === "collector-card") {
    backComposed = frontComposed;
    await writePng(runDir, backFilename, frontImage.buffer);
  } else {
    backComposed = renderArtDirectorBackPrompt(
      input.profile,
      backFields,
      compositionSeed,
      creativeSettings,
      input.artifact,
      input.styleDirective,
    );
    const backResult = await generateArtwork(
      artworkContext(artDirectorPromptText(backComposed), backFields, input.profile),
      {
        count: 1,
        quality: "medium",
        size: "1024x1536",
        referenceImage: frontImage.buffer,
      },
    );
    const backImage = backResult.images[0];
    if (!backImage) throw new Error("Back generation failed");
    await writePng(runDir, backFilename, backImage.buffer);
  }

  const manifest: VNextManifest = {
    runId,
    runDir,
    eraSlug: input.profile.slug,
    artifact: input.artifact,
    frontFields,
    backFields,
    visualWorldId: resolveVisualWorldFromRvbr(input.profile),
    provider: resolveArtworkProvider(),
    frontFilename,
    backFilename,
    serialNumber: serialForRun(runId),
    compositionSeed,
    creativeSettings,
    styleDirective: input.styleDirective,
    resolvedArtifactArchetype: resolveArtifactArchetype(
      creativeSettings.artifactArchetype,
      compositionSeed,
    ),
    parentGenerationId: input.parentGenerationId,
    variationBatchId: input.variationBatchId,
    promptInspector: { front: frontComposed, back: backComposed },
    collectorCardContent: input.frontFields.collectorCardContent,
    collectorCardPresentation: input.frontFields.collectorCardPresentation,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await writeManifest(runDir, manifest);
  await syncGenerationFromVNext(manifest, input.profile, {
    parentGenerationId: input.parentGenerationId,
    variationBatchId: input.variationBatchId,
  });
  return manifest;
}

export async function runVNextRegenerateFront(args: {
  runId: string;
  profile: RvbrProfile;
  frontFields: ArtDirectorFields;
  creativeSettings?: CreativeDirectionSettings;
}): Promise<VNextManifest> {
  const manifest = await loadVNextManifest(args.runId);
  const fields = { ...args.frontFields, passTypeLabel: normalizePassTypeLabel(args.frontFields.passTypeLabel) };

  const compositionSeed = Date.now();
  const creativeSettings =
    args.creativeSettings ?? manifest.creativeSettings ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS;
  const composed = renderArtDirectorFrontPrompt(
    args.profile,
    fields,
    compositionSeed,
    creativeSettings,
    manifest.artifact,
    manifest.styleDirective,
  );
  const result = await generateArtwork(
    artworkContext(artDirectorPromptText(composed), fields, args.profile),
    {
    count: 1,
    quality: "medium",
    size: "1024x1536",
  });
  const image = result.images[0];
  if (!image) throw new Error("Front regeneration failed");

  await writePng(manifest.runDir, manifest.frontFilename, image.buffer);
  manifest.frontFields = fields;
  manifest.compositionSeed = compositionSeed;
  manifest.creativeSettings = creativeSettings;
  if (manifest.promptInspector) {
    manifest.promptInspector.front = composed;
  } else {
    manifest.promptInspector = { front: composed, back: composed };
  }
  manifest.eraSlug = args.profile.slug;
  manifest.visualWorldId = resolveVisualWorldFromRvbr(args.profile);
  manifest.exportZipFilename = undefined;
  manifest.updatedAt = new Date().toISOString();
  await writeManifest(manifest.runDir, manifest);
  await syncGenerationFromVNext(manifest, args.profile);
  return manifest;
}

export async function runVNextRegenerateBack(args: {
  runId: string;
  profile: RvbrProfile;
  backFields: ArtDirectorFields;
  creativeSettings?: CreativeDirectionSettings;
}): Promise<VNextManifest> {
  const manifest = await loadVNextManifest(args.runId);
  const fields = { ...args.backFields, passTypeLabel: normalizePassTypeLabel(args.backFields.passTypeLabel) };
  const frontBuffer = await readFile(join(manifest.runDir, manifest.frontFilename));

  const compositionSeed = manifest.compositionSeed ?? Date.now();
  const creativeSettings =
    args.creativeSettings ?? manifest.creativeSettings ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS;
  const composed = renderArtDirectorBackPrompt(
    args.profile,
    fields,
    compositionSeed,
    creativeSettings,
    manifest.artifact,
    manifest.styleDirective,
  );
  const result = await generateArtwork(
    artworkContext(artDirectorPromptText(composed), fields, args.profile),
    {
    count: 1,
    quality: "medium",
    size: "1024x1536",
    referenceImage: frontBuffer,
  });
  const image = result.images[0];
  if (!image) throw new Error("Back regeneration failed");

  await writePng(manifest.runDir, manifest.backFilename, image.buffer);
  manifest.backFields = fields;
  manifest.creativeSettings = creativeSettings;
  if (manifest.promptInspector) {
    manifest.promptInspector.back = composed;
  } else {
    manifest.promptInspector = { front: composed, back: composed };
  }
  manifest.eraSlug = args.profile.slug;
  manifest.visualWorldId = resolveVisualWorldFromRvbr(args.profile);
  manifest.exportZipFilename = undefined;
  manifest.updatedAt = new Date().toISOString();
  await writeManifest(manifest.runDir, manifest);
  await syncGenerationFromVNext(manifest, args.profile);
  return manifest;
}

export async function runVNextExport(
  runId: string,
  profile: RvbrProfile,
  options?: {
    quantity?: number;
    qrUrl?: string;
    numbering?: PassNumberingSettings;
    qrPlacement?: PassQrPlacement;
  },
): Promise<
  VNextManifest & {
    exportZipPath: string;
    qrVerification?: QrVerificationResult;
    printPackage: PrintPackagePaths | CollectorCardExportPaths;
    qrStatus: QrExportStatus;
  }
> {
  const manifest = await loadVNextManifest(runId);
  const exportDir = join(manifest.runDir, "export");
  const frontPng = await readFile(join(manifest.runDir, manifest.frontFilename));
  if (manifest.artifact === "collector-card") {
    const zipBasename = `${manifest.frontFields.event.replace(/\s+/g, "-")}-collector-card`;
    const printPackage = await buildCollectorCardExportPackage({
      exportDir,
      frontPng,
      runId,
      zipBasename,
      metadata: {
        artifact: manifest.artifact,
        collectorCardContent: manifest.collectorCardContent,
        collectorCardPresentation: manifest.collectorCardPresentation,
      },
    });

    manifest.exportZipFilename = `export/${printPackage.paths.fullZip}`;
    manifest.printPackage = printPackage.paths;
    manifest.qrStatus = "composited";
    manifest.updatedAt = new Date().toISOString();
    await writeManifest(manifest.runDir, manifest);
    await syncGenerationFromVNext(manifest, profile);

    return {
      ...manifest,
      exportZipPath: join(exportDir, printPackage.paths.fullZip),
      qrVerification: manifest.qrVerification,
      printPackage: printPackage.paths,
      qrStatus: "composited",
    };
  }
  const backPng = await readFile(join(manifest.runDir, manifest.backFilename));
  const quantity = normalizePrintQuantity(options?.quantity ?? manifest.quantity, 12);
  const numbering = options?.numbering ?? manifest.numbering ?? DEFAULT_PASS_NUMBERING;
  const qrPlacement = normalizeQrPlacement(options?.qrPlacement) ?? normalizeQrPlacement(manifest.qrPlacement);
  const qrUrl =
    options?.qrUrl?.trim() || manifest.backFields.qrUrl?.trim() || "https://retroverse.live";
  manifest.backFields = { ...manifest.backFields, qrUrl };
  manifest.quantity = quantity;
  manifest.numbering = numbering;
  const zipBasename = `${manifest.frontFields.event.replace(/\s+/g, "-")}-print-package`;

  const printPackage = await buildVNextPrintPackage({
    exportDir,
    frontPng,
    backPng,
    qrUrl,
    qrPlacement,
    event: manifest.frontFields.event,
    runId,
    quantity,
    numbering,
    zipBasename,
  });

  manifest.exportZipFilename = printPackage.paths.fullZip;
  manifest.quantity = quantity;
  manifest.numbering = numbering;
  manifest.printPackage = printPackage.paths;
  manifest.qrPlacement = qrPlacement;
  manifest.serialNumber =
    printPackage.serials[0] ?? printPackage.writeInLabel ?? serialForRun(runId);
  manifest.qrVerification = printPackage.qrVerification;
  manifest.qrStatus = printPackage.qrStatus;
  manifest.updatedAt = new Date().toISOString();
  await writeManifest(manifest.runDir, manifest);

  const synced = await syncGenerationFromVNext(manifest, profile);
  void synced;

  const exportZipPath = join(exportDir, printPackage.paths.fullZip);
  return {
    ...manifest,
    exportZipPath,
    qrVerification: printPackage.qrVerification,
    printPackage: printPackage.paths,
    qrStatus: printPackage.qrStatus,
  };
}

export async function saveVNextQrPlacement(
  runId: string,
  profile: RvbrProfile,
  options: {
    qrPlacement: PassQrPlacement;
    qrUrl?: string;
  },
): Promise<VNextManifest> {
  const manifest = await loadVNextManifest(runId);
  manifest.qrPlacement = options.qrPlacement;
  if (options.qrUrl?.trim()) {
    manifest.backFields = { ...manifest.backFields, qrUrl: options.qrUrl.trim() };
  }
  manifest.exportZipFilename = undefined;
  manifest.printPackage = undefined;
  manifest.qrVerification = undefined;
  manifest.qrStatus = undefined;
  manifest.updatedAt = new Date().toISOString();
  await writeManifest(manifest.runDir, manifest);
  await syncGenerationFromVNext(manifest, profile);
  return manifest;
}

export function vNextFileUrl(runId: string, filename: string): string {
  return `/api/ops/content-creator/vnext/files/${encodeURIComponent(runId)}/${encodeURIComponent(filename)}`;
}
