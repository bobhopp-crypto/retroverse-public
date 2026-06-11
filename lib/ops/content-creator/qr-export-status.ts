import type { QrVerificationResult } from "@/lib/ops/creative-lab/pass-export-composite";

export type QrExportStatus = "not_exported" | "composited" | "scan_verified" | "failed";

export const QR_STATUS_LABELS: Record<QrExportStatus, string> = {
  not_exported: "Not exported",
  composited: "QR composited",
  scan_verified: "Scan verified",
  failed: "Failed",
};

export function resolveQrExportStatus(args: {
  exported: boolean;
  qrVerification?: QrVerificationResult | null;
}): QrExportStatus {
  if (!args.exported) return "not_exported";
  if (!args.qrVerification) return "composited";
  if (args.qrVerification.decodePass && args.qrVerification.ok) return "scan_verified";
  if (args.qrVerification.decodePass) return "scan_verified";
  return "failed";
}
