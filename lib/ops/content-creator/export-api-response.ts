import {
  serialNumberPreview,
  type PassNumberingSettings,
} from "@/lib/ops/content-creator/pass-numbering";
import { QR_STATUS_LABELS } from "@/lib/ops/content-creator/qr-export-status";
import { vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import type { QrVerificationResult } from "@/lib/ops/creative-lab/pass-export-composite";
import type { CollectorCardExportPaths } from "@/lib/ops/content-creator/collector-card-export";
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
  qrVerification?: QrVerificationResult;
  printPackage: PrintPackagePaths | CollectorCardExportPaths;
}) {
  const pkg = result.printPackage;
  const numbering = result.numbering;
  const quantity = result.quantity ?? 12;
  const isCollectorCard = "singleFrontPdf" in pkg;
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
    singleBackUrl: isCollectorCard ? undefined : urlFor(result.runId, pkg.singleBack),
    singlePassZipUrl: isCollectorCard ? undefined : urlFor(result.runId, pkg.singlePassZip),
    printFrontPngUrls: isCollectorCard ? [urlFor(result.runId, pkg.singleFront)] : pkg.printFrontPng.map((p) => urlFor(result.runId, p)),
    printBackPngUrls: isCollectorCard ? [] : pkg.printBackPng.map((p) => urlFor(result.runId, p)),
    printFrontPdfUrls: isCollectorCard ? [urlFor(result.runId, pkg.singleFrontPdf)] : pkg.printFrontPdf.map((p) => urlFor(result.runId, p)),
    printBackPdfUrls: isCollectorCard ? [] : pkg.printBackPdf.map((p) => urlFor(result.runId, p)),
    printInstructionsUrl: isCollectorCard ? undefined : urlFor(result.runId, pkg.printInstructions),
    metadataManifestUrl: urlFor(result.runId, pkg.metadataManifest),
    qrScanReportUrl: isCollectorCard ? undefined : urlFor(result.runId, pkg.qrScanReport),
    printPackage: pkg,
  };
}

export type ExportApiPayload = ReturnType<typeof buildExportApiResponse>;
