import { PDFDocument } from "pdf-lib";

import { PRINT_SHEET_HEIGHT_IN, PRINT_SHEET_WIDTH_IN } from "@/lib/ops/content-creator/print-sheet";

const PT_PER_IN = 72;

/** Embed a print-sheet PNG as a full-page landscape PDF at 100% scale. */
export async function pngSheetToPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const pageW = PRINT_SHEET_WIDTH_IN * PT_PER_IN;
  const pageH = PRINT_SHEET_HEIGHT_IN * PT_PER_IN;
  const page = pdf.addPage([pageW, pageH]);
  const image = await pdf.embedPng(pngBuffer);
  page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
  return Buffer.from(await pdf.save());
}
