/**
 * QR production metrics for 2.25" × 3.5" credential export.
 * Run: npx tsx tools/content-creator/qr-production-audit.ts [url]
 */
import {
  PASS_PRINT_HEIGHT_IN,
  PASS_PRINT_WIDTH_IN,
  QR_PRINT_SIZE_IN,
  QR_ZONE,
  qrCardWidthPercent,
} from "@/lib/ops/creative-lab/pass-layout";
import {
  generateZoneFillingQrPng,
  QR_MAX_MATRIX_FILL_PERCENT,
  QR_MIN_MATRIX_FILL_PERCENT,
} from "@/lib/ops/creative-lab/qr-zone-render";

const url = process.argv[2] ?? "https://retroverse.live";

async function main() {
  const { audit, quietModules } = await generateZoneFillingQrPng(url, QR_ZONE.size);

  const cardQrWidthRatio = QR_PRINT_SIZE_IN / PASS_PRINT_WIDTH_IN;
  const cardQrHeightRatio = QR_PRINT_SIZE_IN / PASS_PRINT_HEIGHT_IN;

  console.log(
    JSON.stringify(
      {
        canvasPrintIn: { width: PASS_PRINT_WIDTH_IN, height: PASS_PRINT_HEIGHT_IN },
        reservedZonePx: QR_ZONE.size,
        reservedZonePrintIn: QR_PRINT_SIZE_IN,
        qrWidthPercentOfCard: qrCardWidthPercent(),
        qrAreaPercentOfCard: Math.round(cardQrWidthRatio * cardQrHeightRatio * 100),
        matrixFillPercent: audit.matrixFillPercent,
        matrixFillTarget: `${QR_MIN_MATRIX_FILL_PERCENT}-${QR_MAX_MATRIX_FILL_PERCENT}`,
        physicalMatrixIn: {
          width: audit.physicalMatrixWidthIn,
          height: audit.physicalMatrixHeightIn,
        },
        quietModulesUsed: quietModules,
        scanGuidance: {
          lanyardDistanceIn: "8-12",
          instantScanRequires: "matrix >= 1.5in AND decode pass on export",
          visualBalance: "QR functional but upper artwork remains hero",
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
