"use client";

import type { PassExportReport } from "@/lib/ops/creative-lab/pass-export-composite";

export type ExportCompleteState = {
  exportDir: string;
  frontFilename: string;
  backFilename: string;
  zipFilename: string;
  zipRel: string;
  report: PassExportReport;
};

type Props = {
  projectId: string;
  exportResult: ExportCompleteState;
  onDismiss: () => void;
};

export function ExportCompletePanel({ projectId, exportResult, onDismiss }: Props) {
  const { exportDir, frontFilename, backFilename, zipFilename, zipRel, report } = exportResult;

  async function revealInFinder(targetPath: string) {
    const res = await fetch(
      `/api/ops/creative-lab/projects/${encodeURIComponent(projectId)}/export/reveal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath }),
      },
    );
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? "reveal_failed");
  }

  const downloadUrl = `/api/ops/creative-lab/projects/${encodeURIComponent(projectId)}/export/download?file=${encodeURIComponent(zipRel)}`;

  return (
    <aside className="cc-export-panel" aria-label="Export complete">
      <div className="cc-export-panel__head">
        <h2>Export Complete</h2>
        <button type="button" className="cc-export-panel__close" onClick={onDismiss}>
          Dismiss
        </button>
      </div>

      <dl className="cc-export-panel__files">
        <div>
          <dt>Front</dt>
          <dd>
            <code>{frontFilename}</code>
          </dd>
        </div>
        <div>
          <dt>Back</dt>
          <dd>
            <code>{backFilename}</code>
            <span className="cc-export-panel__qr">
              QR: {report.qrVerification.ok ? "✓ verified scannable" : "⚠ verification failed"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Package</dt>
          <dd>
            <code>{zipFilename}</code>
          </dd>
        </div>
      </dl>

      <p className="cc-export-panel__path">
        <span>Export folder</span>
        <code>{exportDir}</code>
      </p>

      {report.qrVerification.notes.length ? (
        <ul className="cc-export-panel__notes">
          {report.qrVerification.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="cc-export-panel__actions">
        <button
          type="button"
          className="cc-btn cc-btn--primary"
          onClick={() => void revealInFinder(report.back.path)}
        >
          Reveal in Finder
        </button>
        <button
          type="button"
          className="cc-btn"
          onClick={() => void revealInFinder(exportDir)}
        >
          Open Export Folder
        </button>
        <a className="cc-btn cc-btn--export" href={downloadUrl} download={zipFilename}>
          Download Package
        </a>
      </div>
    </aside>
  );
}
