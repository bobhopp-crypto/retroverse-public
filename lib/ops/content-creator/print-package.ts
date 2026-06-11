import { execFile } from "node:child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import {
  verifyQrInCompositeBuffer,
  type QrVerificationResult,
} from "@/lib/ops/creative-lab/pass-export-composite";
import { QrExportVerificationError } from "@/lib/ops/content-creator/qr-export-error";
import { pngSheetToPdf } from "@/lib/ops/content-creator/print-pdf";
import {
  buildPrintSheetPng,
  PASSES_PER_SHEET,
  printInstructionsText,
} from "@/lib/ops/content-creator/print-sheet";
import { resolveQrExportStatus, type QrExportStatus } from "@/lib/ops/content-creator/qr-export-status";
import {
  DEFAULT_PASS_NUMBERING,
  normalizePrintQuantity,
  resolveSerialStampOverlay,
  sheetCountForQuantity,
  writeInStampLabel,
  type PassNumberingSettings,
} from "@/lib/ops/content-creator/pass-numbering";
import { compositeVNextBackPng, compositeVNextFrontPng } from "@/lib/ops/content-creator/vnext-export";

const execFileAsync = promisify(execFile);

export type PrintPackagePaths = {
  singleFront: string;
  singleBack: string;
  singlePassZip: string;
  printFrontPng: string[];
  printBackPng: string[];
  printFrontPdf: string[];
  printBackPdf: string[];
  metadataManifest: string;
  qrScanReport: string;
  printInstructions: string;
  fullZip: string;
};

export type PrintPackageResult = {
  exportRoot: string;
  quantity: number;
  sheetCount: number;
  paths: PrintPackagePaths;
  qrVerification: QrVerificationResult;
  qrStatus: QrExportStatus;
  numbering: PassNumberingSettings;
  serials: string[];
  writeInLabel: string | null;
};

function sheetBaseName(side: "front" | "back", sheetIndex: number, sheetCount: number): string {
  const suffix = sheetCount === 1 ? "" : `-sheet-${String(sheetIndex + 1).padStart(2, "0")}`;
  return `print-${side}-12up${suffix}`;
}

export async function buildVNextPrintPackage(args: {
  exportDir: string;
  frontPng: Buffer;
  backPng: Buffer;
  qrUrl: string;
  event: string;
  runId: string;
  quantity?: number;
  numbering?: PassNumberingSettings;
  zipBasename: string;
}): Promise<PrintPackageResult> {
  const quantity = normalizePrintQuantity(args.quantity, 12);
  const numbering = args.numbering ?? DEFAULT_PASS_NUMBERING;
  const sheetCount = sheetCountForQuantity(quantity);
  const singleDir = join(args.exportDir, "single");
  const printDir = join(args.exportDir, "print");
  const metaDir = join(args.exportDir, "metadata");
  const numberedDir = join(args.exportDir, "numbered");

  await mkdir(singleDir, { recursive: true });
  await mkdir(printDir, { recursive: true });
  await mkdir(metaDir, { recursive: true });
  await mkdir(numberedDir, { recursive: true });

  const singleFrontPath = join(singleDir, "final-front.png");
  const singleBackPath = join(singleDir, "final-back.png");
  await compositeVNextFrontPng(args.frontPng, singleFrontPath);

  const numberedBackBuffers: Buffer[] = [];
  const serials: string[] = [];
  const writeInLabel = numbering.printSerialNumbers ? null : writeInStampLabel(numbering);

  if (!numbering.printSerialNumbers) {
    const stamp = resolveSerialStampOverlay(numbering, 1, quantity);
    const sharedBack = await compositeVNextBackPng({
      backPng: args.backPng,
      qrUrl: args.qrUrl,
      stamp,
    });
    for (let i = 0; i < quantity; i++) {
      numberedBackBuffers.push(sharedBack);
    }
    await writeFile(join(numberedDir, "back-write-in.png"), sharedBack);
  } else {
    for (let i = 1; i <= quantity; i++) {
      const stamp = resolveSerialStampOverlay(numbering, i, quantity);
      serials.push(stamp.text);
      const backBuffer = await compositeVNextBackPng({
        backPng: args.backPng,
        qrUrl: args.qrUrl,
        stamp,
      });
      numberedBackBuffers.push(backBuffer);
      const pad = String(quantity).length;
      await writeFile(join(numberedDir, `back-${String(i).padStart(pad, "0")}.png`), backBuffer);
    }
  }

  const sampleBack = numberedBackBuffers[0]!;
  const qrVerification = await verifyQrInCompositeBuffer(sampleBack, args.qrUrl);
  if (!qrVerification.ok || !qrVerification.modulesPresent || !qrVerification.decodePass) {
    throw new QrExportVerificationError(qrVerification);
  }

  await writeFile(singleBackPath, sampleBack);

  const singlePassZipName = "single-pass.zip";
  const singlePassZipPath = join(singleDir, singlePassZipName);
  if (process.platform === "darwin") {
    await execFileAsync("zip", ["-j", singlePassZipPath, "final-front.png", "final-back.png"], {
      cwd: singleDir,
    });
  }

  const qrStatus = resolveQrExportStatus({ exported: true, qrVerification });

  const printFrontPng: string[] = [];
  const printBackPng: string[] = [];
  const printFrontPdf: string[] = [];
  const printBackPdf: string[] = [];

  for (let s = 0; s < sheetCount; s++) {
    const start = s * PASSES_PER_SHEET;
    const frontSlots: Buffer[] = [];
    const backSlots: Buffer[] = [];
    for (let slot = 0; slot < PASSES_PER_SHEET; slot++) {
      const passIndex = start + slot;
      if (passIndex < quantity) {
        frontSlots.push(args.frontPng);
        backSlots.push(numberedBackBuffers[passIndex]!);
      }
    }

    const base = sheetBaseName("front", s, sheetCount);
    const frontPngName = `${base}.png`;
    const backPngName = sheetBaseName("back", s, sheetCount) + ".png";
    const frontPngPath = join(printDir, frontPngName);
    const backPngPath = join(printDir, backPngName);

    const frontSheet = await buildPrintSheetPng(frontSlots);
    const backSheet = await buildPrintSheetPng(backSlots);
    await writeFile(frontPngPath, frontSheet);
    await writeFile(backPngPath, backSheet);

    const frontPdfName = `${base}.pdf`;
    const backPdfName = sheetBaseName("back", s, sheetCount) + ".pdf";
    await writeFile(join(printDir, frontPdfName), await pngSheetToPdf(frontSheet));
    await writeFile(join(printDir, backPdfName), await pngSheetToPdf(backSheet));

    printFrontPng.push(`print/${frontPngName}`);
    printBackPng.push(`print/${backPngName}`);
    printFrontPdf.push(`print/${frontPdfName}`);
    printBackPdf.push(`print/${backPdfName}`);
  }

  const metadataManifest = join(metaDir, "manifest.json");
  const qrScanReport = join(metaDir, "qr-scan-report.json");
  const printInstructions = join(metaDir, "print-instructions.txt");

  const manifest = {
    version: 2,
    runId: args.runId,
    exportedAt: new Date().toISOString(),
    event: args.event,
    qrUrl: args.qrUrl,
    quantity,
    sheetCount,
    numbering,
    serials,
    writeInLabel,
    qrStatus,
    paths: {
      singleFront: "single/final-front.png",
      singleBack: "single/final-back.png",
      printFrontPng,
      printBackPng,
      printFrontPdf,
      printBackPdf,
    },
  };

  await writeFile(metadataManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(
    qrScanReport,
    `${JSON.stringify({ exportedAt: manifest.exportedAt, qrUrl: args.qrUrl, qrVerification, qrStatus }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    printInstructions,
    printInstructionsText({ event: args.event, quantity, sheetCount, numbering }),
    "utf8",
  );

  const zipName = `${args.zipBasename}.zip`;
  const zipPath = join(args.exportDir, zipName);
  if (process.platform === "darwin") {
    await execFileAsync("zip", ["-r", zipPath, "single", "print", "metadata"], {
      cwd: args.exportDir,
    });
  }

  return {
    exportRoot: args.exportDir,
    quantity,
    sheetCount,
    paths: {
      singleFront: "single/final-front.png",
      singleBack: "single/final-back.png",
      singlePassZip: "single/single-pass.zip",
      printFrontPng,
      printBackPng,
      printFrontPdf,
      printBackPdf,
      metadataManifest: "metadata/manifest.json",
      qrScanReport: "metadata/qr-scan-report.json",
      printInstructions: "metadata/print-instructions.txt",
      fullZip: zipName,
    },
    qrVerification,
    qrStatus,
    numbering,
    serials,
    writeInLabel,
  };
}
