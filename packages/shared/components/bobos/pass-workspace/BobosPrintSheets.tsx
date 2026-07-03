"use client";

import type { BobosPrintSheetSet } from "@/lib/bobos/project-zero/pass-production-spec";

type Props = {
  sheets: BobosPrintSheetSet | null;
};

function SheetExportActions(props: {
  pdfUrl: string;
  jpegUrl: string;
  sideLabel: string;
  sheetIndex: number;
}) {
  const { pdfUrl, jpegUrl, sideLabel, sheetIndex } = props;
  const jpegDownloadName = `print-sheet-${sheetIndex}-${sideLabel.toLowerCase()}.jpg`;

  return (
    <div className="pzw-sheets__export-actions">
      <a className="ps-btn ps-btn--primary ps-btn--hero" href={pdfUrl} target="_blank" rel="noopener noreferrer">
        Open PDF
      </a>
      <a className="ps-btn ps-btn--hero" href={pdfUrl} download>
        Download PDF
      </a>
      <a className="ps-btn ps-btn--primary ps-btn--hero" href={jpegUrl} target="_blank" rel="noopener noreferrer">
        Open JPEG
      </a>
      <a className="ps-btn ps-btn--hero" href={jpegUrl} download={jpegDownloadName}>
        Download JPEG
      </a>
    </div>
  );
}

/** Sheet downloads for the Print step — build happens in the panel above. */
export function BobosPrintSheets({ sheets }: Props) {
  if (!sheets) return null;

  return (
    <section className="pzw-section pzw-panel ps-step ps-print-area" aria-label="Print sheets">
      <h2 className="ps-step__title">Print Sheets</h2>
      <p className="pzw-print__hint">
        {sheets.sheetCount} sheet{sheets.sheetCount === 1 ? "" : "s"} · {sheets.gridLabel} ({sheets.perSheet} per sheet) · print at 100%
      </p>

      <div id="pzw-open-sheets" className="pzw-sheets__grid">
        {sheets.frontPngUrls.map((frontUrl, i) => (
          <div key={frontUrl} className="pzw-sheets__pair">
            <div className="pzw-sheets__sheet">
              <p className="pzw-sheets__label">
                Sheet {i + 1} of {sheets.sheetCount} — Front
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frontUrl} alt={`Front print sheet ${i + 1}`} className="pzw-sheets__image" />
              <SheetExportActions
                pdfUrl={sheets.frontPdfUrls[i]!}
                jpegUrl={sheets.frontJpegUrls[i]!}
                sideLabel="Front"
                sheetIndex={i + 1}
              />
            </div>
            <div className="pzw-sheets__sheet">
              <p className="pzw-sheets__label">
                Sheet {i + 1} of {sheets.sheetCount} — Back
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sheets.backPngUrls[i]} alt={`Back print sheet ${i + 1}`} className="pzw-sheets__image" />
              <SheetExportActions
                pdfUrl={sheets.backPdfUrls[i]!}
                jpegUrl={sheets.backJpegUrls[i]!}
                sideLabel="Back"
                sheetIndex={i + 1}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
