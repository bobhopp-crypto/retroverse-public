import {
  serialNumberPreview,
  type PassNumberingSettings,
} from "@/lib/ops/content-creator/pass-numbering";
import { QR_STATUS_LABELS } from "@/lib/ops/content-creator/qr-export-status";
import { vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import type { QrVerificationResult } from "@/lib/ops/creative-lab/pass-export-composite";
import type { PrintPackagePaths } from "@/lib/ops/content-creator/print-package";
import type { QrExportStatus } from "@/lib/ops/content-creator/qr-export-status";

function urlFor(runId: string, rel: string): string {
  return vNextFileUrl(runId, `export/${rel}`);
}

export function buildExportApiResponse(result: {
  runId: string;
  quantity?: number;
  numbering?: PassNumberingSettings;
  qrStatus: QrExportStatus;
  qrVerification: QrVerificationResult;
  printPackage: PrintPackagePaths;
}) {
  const pkg = result.printPackage;
  const numbering = result.numbering;
  const quantity = result.quantity ?? 12;
  return {
    ok: true as const,
    quantity,
    numbering,
    serialPreview: numbering ? serialNumberPreview(numbering, quantity) : null,
    qrStatus: result.qrStatus,
    qrStatusLabel: QR_STATUS_LABELS[result.qrStatus],
    qrVerification: result.qrVerification,
    exportZipUrl: urlFor(result.runId, pkg.fullZip),
    singleFrontUrl: urlFor(result.runId, pkg.singleFront),
    singleBackUrl: urlFor(result.runId, pkg.singleBack),
    singlePassZipUrl: urlFor(result.runId, pkg.singlePassZip),
    printFrontPngUrls: pkg.printFrontPng.map((p) => urlFor(result.runId, p)),
    printBackPngUrls: pkg.printBackPng.map((p) => urlFor(result.runId, p)),
    printFrontPdfUrls: pkg.printFrontPdf.map((p) => urlFor(result.runId, p)),
    printBackPdfUrls: pkg.printBackPdf.map((p) => urlFor(result.runId, p)),
    printInstructionsUrl: urlFor(result.runId, pkg.printInstructions),
    metadataManifestUrl: urlFor(result.runId, pkg.metadataManifest),
    qrScanReportUrl: urlFor(result.runId, pkg.qrScanReport),
    printPackage: pkg,
  };
}

export type ExportApiPayload = ReturnType<typeof buildExportApiResponse>;
