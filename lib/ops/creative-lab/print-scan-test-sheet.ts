import {
  PASS_PRINT_HEIGHT_IN,
  PASS_PRINT_WIDTH_IN,
} from "./pass-layout";
import type { QrVerificationResult } from "./pass-export-composite";

export type PrintScanTestInput = {
  title: string;
  frontImageDataUrl: string;
  backImageDataUrl: string;
  qrVerification?: QrVerificationResult | null;
};

/** HTML print sheet — actual-size credential (2.25" × 3.5") + scan instructions. */
export function buildPrintScanTestHtml(input: PrintScanTestInput): string {
  const v = input.qrVerification;
  const warnings: string[] = [];
  if (v?.printSizeWarning) {
    warnings.push(`QR physical size (${v.physicalWidthIn.toFixed(2)}") is below the ${v.minSizeIn}"+ recommended minimum for lanyard scanning.`);
  }
  if (v?.matrixFillWarning) {
    warnings.push(`QR matrix fill (${v.matrixFillPercent.toFixed(1)}%) is below the 85% target — re-export may help.`);
  }
  if (v && !v.decodePass) {
    warnings.push("Last export decode test FAILED — do not print until export passes scan test.");
  }

  const warningBlock =
    warnings.length > 0
      ? `<section class="warnings"><h2>⚠ Print warnings</h2><ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul></section>`
      : "";

  const metrics = v
    ? `<p>QR matrix: ${v.matrixFillPercent.toFixed(1)}% of safe area · Physical: ${v.physicalWidthIn.toFixed(2)}" × ${v.physicalHeightIn.toFixed(2)}" · Decode: ${v.decodePass ? "PASS" : "FAIL"}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Retroverse Print Scan Test — ${escapeHtml(input.title)}</title>
  <style>
    @page { margin: 0.5in; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.45;
      color: #1a1a1a;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
    h2 { font-size: 1.1rem; margin: 1.25rem 0 0.5rem; }
    .instructions { background: #f5efe3; border: 2px solid #1a6b6b; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .instructions ol { margin: 0.5rem 0 0; padding-left: 1.25rem; }
    .warnings { background: #fff8e6; border: 2px solid #c45f00; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .warnings ul { margin: 0.35rem 0 0; }
    .credential-row { display: flex; gap: 0.75in; flex-wrap: wrap; margin: 1rem 0; align-items: flex-start; }
    .credential {
      width: ${PASS_PRINT_WIDTH_IN}in;
      height: ${PASS_PRINT_HEIGHT_IN}in;
      border: 1px solid #ccc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      overflow: hidden;
      page-break-inside: avoid;
    }
    .credential img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .credential figcaption { font-size: 11px; font-weight: 700; text-align: center; margin-top: 0.25rem; }
    .metrics { color: #555; font-size: 13px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>Retroverse Print Scan Test</h1>
  <p><strong>${escapeHtml(input.title)}</strong></p>
  ${metrics}
  ${warningBlock}
  <section class="instructions">
    <h2>Scan verification steps</h2>
    <ol>
      <li>Print this page at <strong>100% scale</strong> — do not fit to page or shrink.</li>
      <li>Cut out the credential at the printed border (${PASS_PRINT_WIDTH_IN}" × ${PASS_PRINT_HEIGHT_IN}").</li>
      <li>Hold phone camera 8–12 inches away (typical lanyard scan distance).</li>
      <li>Scan the <strong>back</strong> QR — it should open the configured URL.</li>
      <li>If scan fails: re-export, check for artwork overlapping the white QR square, verify matrix fill ≥85%.</li>
    </ol>
  </section>
  <section class="credential-row">
    <figure>
      <div class="credential"><img src="${input.frontImageDataUrl}" alt="Front" /></div>
      <figcaption>Front</figcaption>
    </figure>
    <figure>
      <div class="credential"><img src="${input.backImageDataUrl}" alt="Back" /></div>
      <figcaption>Back (scan this)</figcaption>
    </figure>
  </section>
  <p class="no-print metrics">Generated ${new Date().toLocaleString()} · Retroverse Content Creator</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
