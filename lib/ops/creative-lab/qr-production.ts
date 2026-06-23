/** Verification code is production data — composited at export only, never AI artwork. */

export const QR_EXPORT_REQUIRED_MESSAGE = "Export required for QR verification.";

export const QR_PRODUCTION_DATA_RULES = [
  `EXPORT-OWNED VERIFICATION AREA — NOT ARTWORK:`,
  `The reserved area on the back is one production-safe reserved square — equal width and height, visually about 40–43% of card height.`,
  `Sharp 90-degree corners only: no rounded corners, no badge shape, no medallion, no rectangle, no band.`,
  `The square interior stays completely empty flat white — no text, no labels, no QR graphics, no checkerboard, no code modules, no barcode, no scannable pattern.`,
  `Production export will render the verification code later; artwork should only reserve the square.`,
  `The reserve is important for scanning, but it must not become the primary design element.`,
  `Quiet zone is enforced automatically at export — do not simulate it in the illustration.`,
].join("\n");
