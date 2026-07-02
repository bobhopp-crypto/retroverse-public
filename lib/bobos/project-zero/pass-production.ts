import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

import { loadGenerationManifest } from "@/lib/ops/content-creator/library";
import { contentCreatorRoot } from "@/lib/ops/content-creator/library/paths";
import {
  PRINT_SHEET_COLS,
  PRINT_SHEET_HEIGHT_IN,
  PRINT_SHEET_ROWS,
  PRINT_SHEET_WIDTH_IN,
} from "@/lib/ops/content-creator/print-sheet";
import { compositeQrOntoBackBuffer } from "@/lib/ops/creative-lab/pass-export-composite";
import {
  PASS_HEIGHT,
  PASS_PRINT_HEIGHT_IN,
  PASS_PRINT_WIDTH_IN,
  PASS_WIDTH,
  QR_ZONE,
  SERIAL_HEIGHT_PX,
  SERIAL_WIDTH_PX,
  SERIAL_X0,
  SERIAL_Y0,
} from "@/lib/ops/creative-lab/pass-layout";
import { assertWellFormedSvg } from "@/lib/ops/creative-lab/svg-validate";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

/**
 * BobOS Pass Production Specification — the single shared source of truth for finished
 * pass dimensions, reserved zones, and print layout.
 *
 * The AI image provider only produces portrait canvases at fixed sizes (1024×1536 — a 2:3
 * ratio). That does NOT equal the required finished ratio of 2.25 × 3.5 (≈0.643 vs 0.667).
 * Printing the raw 1024×1536 canvas at a true 2.25" width would yield a 3.375" tall pass,
 * not 3.5" — a real "scaling surprise" the spec explicitly forbids. So every pass is
 * center-cropped, symmetrically, to the exact 2.25:3.5 ratio before it is ever composited,
 * previewed, or printed. Height is the anchor (it's the AI canvas's tallest usable
 * dimension); a thin, even strip is trimmed from each side of the width.
 *
 * Nothing here is duplicated elsewhere — the raw canvas size, QR reserve, and serial
 * reserve are all imported unchanged from `pass-layout.ts` (the same file the Content
 * Creator / vNext export pipeline uses); only the finished-canvas crop and DPI are BobOS's
 * own correction, applied entirely within this module.
 *
 * BobOS Composer scope (restored, post-Composer-1.0): the AI generates the finished
 * collectible design — typography, pass-type hierarchy, event styling, front/back layout —
 * with QR and serial reserves left blank. BobOS composites ONLY those two production
 * elements afterward. No decorative overlays (frames, bands, badges, security marks) are
 * added on top of AI artwork.
 */
const RAW_WIDTH_PX = PASS_WIDTH;
const RAW_HEIGHT_PX = PASS_HEIGHT;

/** True, uniform DPI once cropped to the exact 2.25:3.5 ratio — height-anchored. */
const TRUE_DPI = RAW_HEIGHT_PX / PASS_PRINT_HEIGHT_IN;

const FINISHED_WIDTH_PX = Math.round(PASS_PRINT_WIDTH_IN * TRUE_DPI);
const FINISHED_HEIGHT_PX = RAW_HEIGHT_PX;
const CROP_LEFT_PX = Math.round((RAW_WIDTH_PX - FINISHED_WIDTH_PX) / 2);

/** QR + serial reserves, translated from the raw canvas onto the finished (cropped) canvas. */
const QR_RESERVE = { left: QR_ZONE.left - CROP_LEFT_PX, top: QR_ZONE.top, size: QR_ZONE.size };
const SERIAL_RESERVE = { left: SERIAL_X0 - CROP_LEFT_PX, top: SERIAL_Y0, width: SERIAL_WIDTH_PX, height: SERIAL_HEIGHT_PX };

export const PASS_PRODUCTION_SPEC = {
  finishedWidthIn: PASS_PRINT_WIDTH_IN,
  finishedHeightIn: PASS_PRINT_HEIGHT_IN,
  /** Full-bleed artwork to the trim edge — no additional print bleed margin is added. */
  bleedIn: 0,
  dpi: Math.round(TRUE_DPI),
  widthPx: FINISHED_WIDTH_PX,
  heightPx: FINISHED_HEIGHT_PX,
  qrReserve: { ...QR_RESERVE },
  serialReserve: { ...SERIAL_RESERVE },
  printSheet: {
    widthIn: PRINT_SHEET_WIDTH_IN,
    heightIn: PRINT_SHEET_HEIGHT_IN,
    cols: PRINT_SHEET_COLS,
    rows: PRINT_SHEET_ROWS,
    perSheet: PRINT_SHEET_COLS * PRINT_SHEET_ROWS,
  },
} as const;

/** Crops a raw AI-generated PNG (1024×1536) to the exact 2.25:3.5 finished canvas. */
async function cropToFinishedCanvas(png: Buffer): Promise<Buffer> {
  return sharp(png)
    .extract({ left: CROP_LEFT_PX, top: 0, width: FINISHED_WIDTH_PX, height: FINISHED_HEIGHT_PX })
    .png()
    .toBuffer();
}

function seededRandom(seedText: string): () => number {
  let h = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    h = (h * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >>> 8) / 0xffffff;
  };
}

const STAMP_INK = "#7d1c1c";
const STAMP_OVERFLOW_PX = 26;

/**
 * A realistic hand-stamped serial — distressed dark-red ink, slight random rotation and
 * opacity, sized and centered to fit the shared serial reserve. Doubles as the pass's
 * subtle Retroverse authenticity mark. Deterministic per serial (stable re-renders), but
 * visually distinct pass-to-pass so every pass looks individually stamped.
 */
function renderSerialStampSvg(serial: string): {
  svg: string;
  compositeLeft: number;
  compositeTop: number;
} {
  const rand = seededRandom(serial);
  const rotation = (rand() - 0.5) * 10; // -5..+5 degrees
  const opacity = 0.86 + rand() * 0.12; // 0.86..0.98
  const turbulenceSeed = Math.floor(rand() * 1000);

  const boxW = SERIAL_RESERVE.width;
  const boxH = SERIAL_RESERVE.height;
  const canvasWidth = boxW + STAMP_OVERFLOW_PX * 2;
  const canvasHeight = boxH + STAMP_OVERFLOW_PX * 2;
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const pad = 8;

  const svg = `
<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="grunge" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${turbulenceSeed}" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 -0.45" result="noiseAlpha"/>
      <feComposite in="SourceGraphic" in2="noiseAlpha" operator="in" result="distressed"/>
      <feGaussianBlur in="distressed" stdDeviation="0.25"/>
    </filter>
  </defs>
  <g transform="rotate(${rotation.toFixed(2)} ${cx} ${cy})" opacity="${opacity.toFixed(2)}">
    <g filter="url(#grunge)">
      <rect x="${STAMP_OVERFLOW_PX + pad}" y="${STAMP_OVERFLOW_PX + pad}" width="${boxW - pad * 2}" height="${boxH - pad * 2}" rx="10" fill="none" stroke="${STAMP_INK}" stroke-width="5"/>
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-family="'Courier New', monospace" font-size="15" font-weight="700" letter-spacing="3" fill="${STAMP_INK}">RETROVERSE &#183; AUTHENTIC</text>
      <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-family="'Courier New', monospace" font-size="30" font-weight="800" letter-spacing="4" fill="${STAMP_INK}">No. ${serial}</text>
    </g>
  </g>
</svg>`.trim();

  assertWellFormedSvg(svg, "bobos-serial-stamp");

  return {
    svg,
    compositeLeft: SERIAL_RESERVE.left - STAMP_OVERFLOW_PX,
    compositeTop: SERIAL_RESERVE.top - STAMP_OVERFLOW_PX,
  };
}

/**
 * Crops a raw AI-generated front PNG to the finished 2.25:3.5 canvas. The front is never
 * touched beyond this crop — no QR, no serial, no decorative overlay — it stays 100%
 * AI-designed collectible artwork, full bleed to the trim edge.
 */
export async function finishBobosPassFront(rawFrontPng: Buffer): Promise<Buffer> {
  return cropToFinishedCanvas(rawFrontPng);
}

/**
 * Crops a raw AI-generated back PNG to the finished canvas, then applies the ONLY two
 * production-critical elements BobOS composites: QR + realistic stamped serial. Reuses the
 * existing QR compositor (`compositeQrOntoBackBuffer`) unmodified — same reserved zone,
 * same size, same automatic quiet-zone tuning as the rest of the pipeline — just translated
 * onto the finished canvas. Everything else on the back (event styling, typography, layout)
 * comes from the AI-designed artwork itself.
 */
export async function finishBobosPassBack(args: {
  rawBackPng: Buffer;
  qrUrl: string;
  serial: string;
}): Promise<Buffer> {
  const cropped = await cropToFinishedCanvas(args.rawBackPng);
  const { buffer: withQr } = await compositeQrOntoBackBuffer({
    backSrc: cropped,
    qrUrl: args.qrUrl,
    qrPlacement: QR_RESERVE,
  });
  const stamp = renderSerialStampSvg(args.serial);
  const stampPng = await sharp(Buffer.from(stamp.svg)).png().toBuffer();
  return sharp(withQr)
    .composite([{ input: stampPng, left: stamp.compositeLeft, top: stamp.compositeTop }])
    .png()
    .toBuffer();
}

/** Reads a raw AI-generated front or back PNG straight from the Content Creator library on disk. */
export async function readGenerationSidePng(generationId: string, side: "front" | "back"): Promise<Buffer> {
  const manifest = await loadGenerationManifest(generationId);
  if (!manifest) throw new Error(`Generation not found: ${generationId}`);
  const relPath = side === "front" ? manifest.frontImagePath : manifest.backImagePath;
  if (!relPath) throw new Error(`No ${side} image recorded for generation ${generationId}`);
  return readFile(join(contentCreatorRoot(), relPath));
}

function bobosPassWorkspaceRendersRoot(): string {
  return join(retroverseDataRoot(), "ops", "bobos", "project-zero", "pass-workspace", "renders");
}

export function bobosRenderFileUrl(relPath: string): string {
  return `/api/bobos/pass-workspace/files/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}

export function bobosRenderAbsolutePath(relPath: string): string {
  return join(bobosPassWorkspaceRendersRoot(), relPath);
}

async function saveBobosRender(relPath: string, buffer: Buffer): Promise<string> {
  const fullPath = bobosRenderAbsolutePath(relPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return bobosRenderFileUrl(relPath);
}

export async function saveBobosPassFront(args: {
  projectId: string;
  batchId: string;
  templateId: string;
  buffer: Buffer;
}): Promise<string> {
  return saveBobosRender(`${args.projectId}/${args.batchId}/front-${args.templateId}.png`, args.buffer);
}

export async function saveBobosPassBack(args: {
  projectId: string;
  batchId: string;
  serial: string;
  buffer: Buffer;
}): Promise<string> {
  return saveBobosRender(`${args.projectId}/${args.batchId}/back-${args.serial}.png`, args.buffer);
}

export type BobosPrintSheetSet = {
  sheetCount: number;
  frontPngUrls: string[];
  backPngUrls: string[];
  frontPdfUrls: string[];
  backPdfUrls: string[];
};

const PT_PER_IN = 72;
const SHEET_PAGE_WIDTH_PT = PRINT_SHEET_WIDTH_IN * PT_PER_IN;
const SHEET_PAGE_HEIGHT_PT = PRINT_SHEET_HEIGHT_IN * PT_PER_IN;

/** Sheet canvas kept at the same true DPI as the finished pass, so cells need no rescale. */
const SHEET_WIDTH_PX = Math.round(PRINT_SHEET_WIDTH_IN * TRUE_DPI);
const SHEET_HEIGHT_PX = Math.round(PRINT_SHEET_HEIGHT_IN * TRUE_DPI);
const GRID_WIDTH_PX = PRINT_SHEET_COLS * FINISHED_WIDTH_PX;
const GRID_HEIGHT_PX = PRINT_SHEET_ROWS * FINISHED_HEIGHT_PX;
const GRID_OFFSET_X = Math.round((SHEET_WIDTH_PX - GRID_WIDTH_PX) / 2);
const GRID_OFFSET_Y = Math.round((SHEET_HEIGHT_PX - GRID_HEIGHT_PX) / 2);
const PASSES_PER_SHEET = PRINT_SHEET_COLS * PRINT_SHEET_ROWS;

function cutMarksSvg(): string {
  const gx = GRID_OFFSET_X;
  const gy = GRID_OFFSET_Y;
  const gw = GRID_WIDTH_PX;
  const gh = GRID_HEIGHT_PX;
  const mark = 10;
  const stroke = "#bbbbbb";
  const lines: string[] = [];

  const corners = [
    [gx, gy],
    [gx + gw, gy],
    [gx, gy + gh],
    [gx + gw, gy + gh],
  ];
  for (const [x, y] of corners) {
    lines.push(`<line x1="${x - mark}" y1="${y}" x2="${x + mark}" y2="${y}" stroke="${stroke}" stroke-width="1"/>`);
    lines.push(`<line x1="${x}" y1="${y - mark}" x2="${x}" y2="${y + mark}" stroke="${stroke}" stroke-width="1"/>`);
  }
  for (let c = 0; c <= PRINT_SHEET_COLS; c += 1) {
    const x = gx + c * FINISHED_WIDTH_PX;
    lines.push(`<line x1="${x}" y1="${gy - mark}" x2="${x}" y2="${gy}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
    lines.push(`<line x1="${x}" y1="${gy + gh}" x2="${x}" y2="${gy + gh + mark}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
  }
  for (let r = 0; r <= PRINT_SHEET_ROWS; r += 1) {
    const y = gy + r * FINISHED_HEIGHT_PX;
    lines.push(`<line x1="${gx - mark}" y1="${y}" x2="${gx}" y2="${y}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
    lines.push(`<line x1="${gx + gw}" y1="${y}" x2="${gx + gw + mark}" y2="${y}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
  }

  const svg = [
    `<svg width="${SHEET_WIDTH_PX}" height="${SHEET_HEIGHT_PX}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="100%" height="100%" fill="#f8f8f8"/>`,
    `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="#ffffff" stroke="#dddddd" stroke-width="1"/>`,
    ...lines,
    `</svg>`,
  ].join("");
  assertWellFormedSvg(svg, "bobos-print-sheet-cut-marks");
  return svg;
}

/** 12-up sheet at the true finished-pass DPI — cells are exact, no scaling. */
async function buildSheetPng(passImages: Buffer[], options?: { mirrorForDuplexLongEdge?: boolean }): Promise<Buffer> {
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let i = 0; i < PASSES_PER_SHEET; i += 1) {
    const img = passImages[i];
    if (!img) continue;
    const baseCol = i % PRINT_SHEET_COLS;
    const col = options?.mirrorForDuplexLongEdge ? PRINT_SHEET_COLS - 1 - baseCol : baseCol;
    const row = Math.floor(i / PRINT_SHEET_COLS);
    composites.push({
      input: img,
      left: GRID_OFFSET_X + col * FINISHED_WIDTH_PX,
      top: GRID_OFFSET_Y + row * FINISHED_HEIGHT_PX,
    });
  }
  const base = await sharp(Buffer.from(cutMarksSvg())).png().toBuffer();
  return sharp(base).composite(composites).png().toBuffer();
}

/** Embeds a sheet PNG as a full-page portrait PDF, stretched to exactly 11" × 17" at 100%. */
async function sheetPngToPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([SHEET_PAGE_WIDTH_PT, SHEET_PAGE_HEIGHT_PT]);
  const image = await pdf.embedPng(pngBuffer);
  page.drawImage(image, { x: 0, y: 0, width: SHEET_PAGE_WIDTH_PT, height: SHEET_PAGE_HEIGHT_PT });
  return Buffer.from(await pdf.save());
}

/**
 * Builds production-ready print sheets (front + back, PNG + PDF, cut marks, duplex mirror)
 * from a project's own finished pass images — the exact same images shown in Preview.
 * Every cell is the true 2.25" × 3.5" finished canvas; the sheet itself is a true 11" × 17"
 * at the same DPI, so printing at 100% produces exact, unscaled passes.
 */
export async function buildBobosPrintSheets(args: {
  projectId: string;
  batchId: string;
  passes: { frontPng: Buffer; backPng: Buffer }[];
}): Promise<BobosPrintSheetSet> {
  const sheetCount = Math.max(1, Math.ceil(args.passes.length / PASSES_PER_SHEET));
  const frontPngUrls: string[] = [];
  const backPngUrls: string[] = [];
  const frontPdfUrls: string[] = [];
  const backPdfUrls: string[] = [];

  for (let s = 0; s < sheetCount; s += 1) {
    const start = s * PASSES_PER_SHEET;
    const slice = args.passes.slice(start, start + PASSES_PER_SHEET);
    if (slice.length === 0) continue;

    const frontSheet = await buildSheetPng(slice.map((p) => p.frontPng));
    const backSheet = await buildSheetPng(
      slice.map((p) => p.backPng),
      { mirrorForDuplexLongEdge: true },
    );

    const suffix = sheetCount === 1 ? "" : `-${String(s + 1).padStart(2, "0")}`;
    const frontPngRel = `${args.projectId}/${args.batchId}/sheet-front${suffix}.png`;
    const backPngRel = `${args.projectId}/${args.batchId}/sheet-back${suffix}.png`;

    frontPngUrls.push(await saveBobosRender(frontPngRel, frontSheet));
    backPngUrls.push(await saveBobosRender(backPngRel, backSheet));
    frontPdfUrls.push(await saveBobosRender(frontPngRel.replace(/\.png$/, ".pdf"), await sheetPngToPdf(frontSheet)));
    backPdfUrls.push(await saveBobosRender(backPngRel.replace(/\.png$/, ".pdf"), await sheetPngToPdf(backSheet)));
  }

  return { sheetCount, frontPngUrls, backPngUrls, frontPdfUrls, backPdfUrls };
}
