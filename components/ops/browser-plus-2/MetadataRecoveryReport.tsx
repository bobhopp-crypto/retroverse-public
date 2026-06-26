"use client";

import type { Bp2MetadataRecoveryRow } from "@/lib/ops/browser-plus-2/types";

type MetadataRecoveryReportProps = {
  rows: Bp2MetadataRecoveryRow[];
  open: boolean;
  onToggle: () => void;
};

export function MetadataRecoveryReport({ rows, open, onToggle }: MetadataRecoveryReportProps) {
  function downloadReport() {
    const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "browser-plus-metadata-recovery-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="bp2__report" aria-label="Metadata recovery report">
      <div className="bp2__report-head">
        <div>
          <h2>Metadata Recovery Report</h2>
          <p className="bp2__muted">{rows.length} VIDEO rows missing XML Author and/or Title</p>
        </div>
        <div className="bp2__report-actions">
          <button type="button" className="bp2__action bp2__action--ghost" onClick={onToggle}>
            {open ? "Hide Report" : "Show Report"}
          </button>
          <button type="button" className="bp2__action bp2__action--ghost" onClick={downloadReport}>
            Download JSON
          </button>
        </div>
      </div>

      {open ? (
        <div className="bp2__report-table-wrap">
          <table className="bp2__report-table">
            <thead>
              <tr>
                <th>File path</th>
                <th>Filename</th>
                <th>XML Artist</th>
                <th>XML Title</th>
                <th>Recovered Artist</th>
                <th>Recovered Title</th>
                <th>RVTR</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.filePath}>
                  <td className="bp2__path">{row.filePath}</td>
                  <td>{row.fileName}</td>
                  <td>{row.xmlArtist ?? "—"}</td>
                  <td>{row.xmlTitle ?? "—"}</td>
                  <td>{row.recoveredArtist ?? "—"}</td>
                  <td>{row.recoveredTitle ?? "—"}</td>
                  <td>{row.rvtr ?? "—"}</td>
                  <td>{row.identityStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
