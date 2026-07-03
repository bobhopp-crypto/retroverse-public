import type { QrVerificationResult } from "@/lib/ops/creative-lab/qr-verification-placeholder";

export class QrExportVerificationError extends Error {
  readonly verification: QrVerificationResult;

  constructor(verification: QrVerificationResult) {
    const summary =
      verification.notes.find((n) => n.includes("FAIL")) ??
      (verification.modulesPresent ? "QR decode failed" : "QR modules missing in export");
    super(summary);
    this.name = "QrExportVerificationError";
    this.verification = verification;
  }
}

export function isQrExportVerificationError(error: unknown): error is QrExportVerificationError {
  return error instanceof QrExportVerificationError;
}
