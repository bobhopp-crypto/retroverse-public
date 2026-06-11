/** QR is production data — composited at export only, never AI artwork. */

export const QR_EXPORT_REQUIRED_MESSAGE = "Export required for QR verification.";

export const QR_PRODUCTION_DATA_RULES = [
  `QR PRODUCTION DATA — NOT ARTWORK:`,
  `The white verification window on the back is an intentional laminate design element.`,
  `AI paints only that empty white square — no QR modules, no checkerboard, no scannable pattern.`,
  `Retroverse generates the real QR at export (SVG → Sharp) into that window at 85–90% matrix fill.`,
  `Quiet zone is enforced automatically at export — do not simulate it in the illustration.`,
].join("\n");
