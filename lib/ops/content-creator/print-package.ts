import { execFile } from "node:child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { verifyQrInComposite, type QrVerificationResult } from "@/lib/ops/creative-lab/pass-export-composite";
import { pngSheetToPdf } from "@/lib/ops/content-creator/print-pdf";
import {
  buildPrintSheetPng,
  PASSES_PER_SHEET,
  printInstructionsText,
} from "@/lib/ops/content-creator/print-sheet";
import { resolveQrExportStatus, type QrExportStatus } from "@/lib/ops/content-creator/qr-export-status";
import {
  formatPassSerial,
  normalizePrintQuantity,
  sheetCountForQuantity,
} from "@/lib/ops/content-creator/serial-stamp";
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
  serials: string[];
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
  zipBasename: string;
}): Promise<PrintPackageResult> {
  const quantity = normalizePrintQuantity(args.quantity, 12);
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

  for (let i = 1; i <= quantity; i++) {
    const serial = formatPassSerial(i, quantity);
    serials.push(serial);
    const backBuffer = await compositeVNextBackPng({
      backPng: args.backPng,
      qrUrl: args.qrUrl,
      serialLabel: serial,
    });
    numberedBackBuffers.push(backBuffer);
    const pad = String(quantity).length;
    await writeFile(join(numberedDir, `back-${String(i).padStart(pad, "0")}.png`), backBuffer);
  }

  await writeFile(singleBackPath, numberedBackBuffers[0]!);

  const singlePassZipName = "single-pass.zip";
  const singlePassZipPath = join(singleDir, singlePassZipName);
  if (process.platform === "darwin") {
    await execFileAsync("zip", ["-j", singlePassZipPath, "final-front.png", "final-back.png"], {
      cwd: singleDir,
    });
  }

  const qrVerification = await verifyQrInComposite(singleBackPath, args.qrUrl);
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
    serials,
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
    printInstructionsText({ event: args.event, quantity, sheetCount }),
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
    serials,
  };
}
