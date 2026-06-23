import { execFile } from "node:child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { pngCardToPdf } from "@/lib/ops/content-creator/print-pdf";

const execFileAsync = promisify(execFile);

export type CollectorCardExportPaths = {
  singleFront: string;
  singleFrontPdf: string;
  metadataManifest: string;
  fullZip: string;
};

export type CollectorCardExportResult = {
  exportRoot: string;
  paths: CollectorCardExportPaths;
};

export async function buildCollectorCardExportPackage(args: {
  exportDir: string;
  frontPng: Buffer;
  runId: string;
  zipBasename: string;
  metadata: Record<string, unknown>;
}): Promise<CollectorCardExportResult> {
  const singleDir = join(args.exportDir, "single");
  const metaDir = join(args.exportDir, "metadata");
  await mkdir(singleDir, { recursive: true });
  await mkdir(metaDir, { recursive: true });

  await writeFile(join(singleDir, "final-front.png"), args.frontPng);
  await writeFile(join(singleDir, "final-front.pdf"), await pngCardToPdf(args.frontPng));

  const manifest = {
    version: 1,
    runId: args.runId,
    exportedAt: new Date().toISOString(),
    ...args.metadata,
    paths: {
      singleFront: "single/final-front.png",
      singleFrontPdf: "single/final-front.pdf",
    },
  };
  await writeFile(join(metaDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const zipName = `${args.zipBasename}.zip`;
  if (process.platform === "darwin") {
    await execFileAsync("zip", ["-r", join(args.exportDir, zipName), "single", "metadata"], {
      cwd: args.exportDir,
    });
  }

  return {
    exportRoot: args.exportDir,
    paths: {
      singleFront: "single/final-front.png",
      singleFrontPdf: "single/final-front.pdf",
      metadataManifest: "metadata/manifest.json",
      fullZip: zipName,
    },
  };
}
