/** Client-safe QR verification placeholders — no sharp/fs imports. */

export type QrZoneAudit = {
  reservedZonePx: { width: number; height: number };
  renderedMatrixPx: { width: number; height: number };
  renderedQrImagePx: { width: number; height: number };
  zoneFillPercent: number;
  matrixFillPercent: number;
  physicalMatrixWidthIn: number;
  physicalMatrixHeightIn: number;
  physicalQrImageWidthIn: number;
  physicalQrImageHeightIn: number;
  quietModulesUsed: number;
  modulePx: number;
  moduleCount: number;
};

export type QrVerificationResult = {
  ok: boolean;
  modulesPresent: boolean;
  decodedUrl: string | null;
  expectedUrl: string;
  notes: string[];
  physicalWidthIn: number;
  physicalHeightIn: number;
  pixelSize: { width: number; height: number };
  minSizeIn: number;
  sizePass: boolean;
  decodePass: boolean;
  matrixFillPercent: number;
  matrixFillPass: boolean;
  matrixFillWarning: boolean;
  printSizeWarning: boolean;
  zoneAudit: QrZoneAudit;
};

const QR_PRINT_MIN_IN = 1.5;

function emptyQrZoneAudit(): QrZoneAudit {
  return {
    reservedZonePx: { width: 0, height: 0 },
    renderedMatrixPx: { width: 0, height: 0 },
    renderedQrImagePx: { width: 0, height: 0 },
    zoneFillPercent: 0,
    matrixFillPercent: 0,
    physicalMatrixWidthIn: 0,
    physicalMatrixHeightIn: 0,
    physicalQrImageWidthIn: 0,
    physicalQrImageHeightIn: 0,
    quietModulesUsed: 4,
    modulePx: 0,
    moduleCount: 0,
  };
}

/** Placeholder when export has not been verified yet. */
export function emptyQrVerification(expectedUrl: string): QrVerificationResult {
  return {
    ok: false,
    modulesPresent: false,
    decodedUrl: null,
    expectedUrl,
    notes: [],
    physicalWidthIn: 0,
    physicalHeightIn: 0,
    pixelSize: { width: 0, height: 0 },
    minSizeIn: QR_PRINT_MIN_IN,
    sizePass: false,
    decodePass: false,
    matrixFillPercent: 0,
    matrixFillPass: false,
    matrixFillWarning: true,
    printSizeWarning: true,
    zoneAudit: emptyQrZoneAudit(),
  };
}
