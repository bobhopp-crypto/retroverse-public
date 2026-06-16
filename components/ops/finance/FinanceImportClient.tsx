"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type {
  FinanceImportHistoryRow,
  FinanceImportStats,
} from "@/lib/ops/finance/finance-canonical-model";
import type { FinanceImportRecord } from "@/lib/ops/finance/db/imports";
import type { FinanceImportPreviewRow } from "@/lib/ops/finance/import-preview";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

const SOURCE_LABELS: Record<string, string> = {
  apple_card: "Apple Card",
  amazon: "Amazon",
  paypal: "PayPal",
  nebat: "NEBAT",
  unknown: "Unknown",
};

type UploadResult = {
  fileName: string;
  source: string;
  importId: number;
  inserted: number;
  skipped: number;
  updated: number;
  autoCategorized: number;
  pending: number;
  status: string;
  note?: string;
};

type PreviewBundle = {
  file: File;
  fileName: string;
  source: string;
  rows: FinanceImportPreviewRow[];
  rowCount: number;
  duplicateCount: number;
  newCount: number;
  status: string;
  note?: string;
};

type Props = {
  stats: FinanceImportStats;
  history: FinanceImportHistoryRow[];
  recentImports: FinanceImportRecord[];
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function FinanceImportClient({ stats, history, recentImports }: Props) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewBundle[]>([]);

  const previewFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) return;

    setBusy(true);
    setError(null);
    setResults([]);
    const form = new FormData();
    for (const file of list) {
      form.append("files", file);
    }

    try {
      const res = await fetch("/api/ops/finance/import/preview", { method: "POST", body: form });
      const data = await readOpsJsonResponse<{
        previews?: Array<Omit<PreviewBundle, "file">>;
      }>(res);
      const bundles: PreviewBundle[] = (data.previews ?? []).map((p, i) => ({
        ...p,
        file: list[i]!,
      }));
      setPreviews(bundles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
      setPreviews([]);
    } finally {
      setBusy(false);
    }
  }, []);

  const commitPreview = useCallback(async () => {
    if (!previews.length) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    for (const bundle of previews) {
      form.append("files", bundle.file);
    }

    try {
      const res = await fetch("/api/ops/finance/import", { method: "POST", body: form });
      const data = await readOpsJsonResponse<{ results?: UploadResult[] }>(res);
      setResults(data.results ?? []);
      setPreviews([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }, [previews, router]);

  const cancelPreview = useCallback(() => {
    setPreviews([]);
    setError(null);
  }, []);

  const displayHistory = history.length ? history : recentImports.map((imp) => ({
    id: imp.id,
    fileName: imp.fileName,
    source: imp.source,
    status: imp.status,
    transactionsInserted: imp.transactionCount,
    transactionsSkipped: 0,
    transactionsUpdated: 0,
    transactionsPending: 0,
    createdAt: imp.createdAt,
  }));

  const totalNew = previews.reduce((s, p) => s + p.newCount, 0);
  const totalDupes = previews.reduce((s, p) => s + p.duplicateCount, 0);

  return (
    <div className="ops-finance-import">
      <div className="ops-finance-import__stats">
        <div>
          <span className="ops-finance__dim">Last import</span>
          <strong>{fmtDate(stats.lastImportDate)}</strong>
        </div>
        <div>
          <span className="ops-finance__dim">Transactions added</span>
          <strong>{stats.transactionsAdded.toLocaleString()}</strong>
        </div>
        <div>
          <span className="ops-finance__dim">Updated</span>
          <strong>{stats.transactionsUpdated.toLocaleString()}</strong>
        </div>
        <div>
          <span className="ops-finance__dim">Awaiting review (2026+)</span>
          <strong>{stats.transactionsAwaitingReview.toLocaleString()}</strong>
        </div>
      </div>

      {previews.length === 0 ? (
        <div
          className={`ops-finance-import__drop ${dragging ? "ops-finance-import__drop--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void previewFiles(e.dataTransfer.files);
          }}
        >
          <p className="ops-finance-import__drop-title">Drop CSV statements here</p>
          <p className="ops-finance-import__drop-sub">
            Apple Card · Amazon · PayPal · NEBAT CSV — preview before import
          </p>
          <p className="ops-finance-import__drop-sub">
            Amazon order history → <a href="/ops/finance/import-amazon">Amazon Import</a> (CSV bulk) ·{" "}
            <a href="/ops/finance/import/nebat">NEBAT PDF</a>
          </p>
          <label className="ops-finance-import__browse">
            <input
              type="file"
              multiple
              accept=".csv"
              hidden
              onChange={(e) => {
                if (e.target.files) void previewFiles(e.target.files);
              }}
            />
            Choose CSV files
          </label>
          {busy ? <p className="ops-finance-import__status">Parsing preview…</p> : null}
          {error ? <p className="ops-finance-import__error">{error}</p> : null}
        </div>
      ) : (
        <section className="ops-finance-import__results">
          <h2 className="ops-finance__panel-title">Import preview</h2>
          <p className="ops-finance-review__lead">
            {previews.map((p) => p.fileName).join(", ")} · {totalNew} new · {totalDupes} duplicate
            {totalDupes === 1 ? "" : "s"}
          </p>
          {previews.map((bundle) =>
            bundle.status === "stored" || bundle.status === "empty" ? (
              <p key={bundle.fileName} className="ops-finance-import__error">
                {bundle.fileName}: {bundle.note ?? "No rows to import"}
              </p>
            ) : (
              <div key={bundle.fileName}>
                <p className="ops-finance__dim">
                  {bundle.fileName} · {SOURCE_LABELS[bundle.source] ?? bundle.source}
                </p>
                <table className="ops-finance-import__table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Merchant</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Proposed account</th>
                      <th>Duplicate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.rows.map((row, idx) => (
                      <tr key={`${bundle.fileName}-${row.transactionDate}-${idx}`}>
                        <td>{row.transactionDate}</td>
                        <td>{row.merchant}</td>
                        <td>{row.description}</td>
                        <td>{fmtMoney(row.amount)}</td>
                        <td>{row.proposedAccount ?? "—"}</td>
                        <td>{row.duplicateWarning ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          )}
          <div className="ops-finance-review__bulk">
            <button
              type="button"
              className="ops-finance-review__btn ops-finance-review__btn--rule"
              disabled={busy || previews.every((p) => p.rowCount === 0)}
              onClick={() => void commitPreview()}
            >
              Import
            </button>
            <button
              type="button"
              className="ops-finance-review__btn"
              disabled={busy}
              onClick={cancelPreview}
            >
              Cancel
            </button>
          </div>
          {error ? <p className="ops-finance-import__error">{error}</p> : null}
        </section>
      )}

      {results.length > 0 ? (
        <section className="ops-finance-import__results">
          <h2 className="ops-finance__panel-title">Import results</h2>
          <ul>
            {results.map((r) => (
              <li key={`import-result-${r.importId}`}>
                <strong>{r.fileName}</strong>
                <span>{SOURCE_LABELS[r.source] ?? r.source}</span>
                <span>
                  {r.inserted} new · {r.updated} updated · {r.autoCategorized} auto · {r.skipped}{" "}
                  skipped · {r.pending} pending review
                </span>
                {r.note ? <em>{r.note}</em> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ops-finance-import__history">
        <h2 className="ops-finance__panel-title">Import history</h2>
        <table className="ops-finance-import__table">
          <thead>
            <tr>
              <th>File</th>
              <th>Source</th>
              <th>Added</th>
              <th>Updated</th>
              <th>Skipped</th>
              <th>Pending</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {displayHistory.map((imp) => (
              <tr key={`import-history-${imp.id}`}>
                <td>{imp.fileName}</td>
                <td>{SOURCE_LABELS[imp.source] ?? imp.source}</td>
                <td>{imp.transactionsInserted}</td>
                <td>{imp.transactionsUpdated}</td>
                <td>{imp.transactionsSkipped}</td>
                <td>{imp.transactionsPending}</td>
                <td>{imp.status}</td>
                <td>{fmtDate(imp.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
