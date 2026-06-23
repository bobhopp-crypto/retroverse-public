import { PDFDocument } from "pdf-lib";

import { PRINT_SHEET_HEIGHT_IN, PRINT_SHEET_WIDTH_IN } from "@/lib/ops/content-creator/print-sheet";

const PT_PER_IN = 72;
const CARD_WIDTH_IN = 2.25;
const CARD_HEIGHT_IN = 3.5;

/** Embed a print-sheet PNG as a full-page portrait PDF at 100% scale. */
export async function pngSheetToPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const pageW = PRINT_SHEET_WIDTH_IN * PT_PER_IN;
  const pageH = PRINT_SHEET_HEIGHT_IN * PT_PER_IN;
  const page = pdf.addPage([pageW, pageH]);
  const image = await pdf.embedPng(pngBuffer);
  page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
  return Buffer.from(await pdf.save());
}

/** Embed a single portrait card PNG as a 2.25" x 3.5" PDF. */
export async function pngCardToPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const pageW = CARD_WIDTH_IN * PT_PER_IN;
  const pageH = CARD_HEIGHT_IN * PT_PER_IN;
  const page = pdf.addPage([pageW, pageH]);
  const image = await pdf.embedPng(pngBuffer);
  page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
  return Buffer.from(await pdf.save());
}
