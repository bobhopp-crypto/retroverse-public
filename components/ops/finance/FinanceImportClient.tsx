"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { FinanceImportHistoryRow } from "@/lib/ops/finance/finance-canonical-model";
import type { FinanceImportPreviewRow } from "@/lib/ops/finance/import-preview";
import type {
  ImportBatchPreview,
  ImportReconciliation,
} from "@/lib/ops/finance/import-batch-service";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

const SOURCE_LABELS: Record<string, string> = {
  apple_card: "Apple Card",
  amazon: "Amazon Orders",
  paypal: "PayPal",
  nebat: "NEBAT Checking",
  unknown: "Unknown",
};

type Props = {
  history: FinanceImportHistoryRow[];
};

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtPeriod(reconciliation: ImportReconciliation | null): string {
  if (!reconciliation?.statementEnd) return "—";
  return new Date(`${reconciliation.statementEnd.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
}

function EditableGrid({
  importId,
  rows,
  onRowsChange,
}: {
  importId: number;
  rows: FinanceImportPreviewRow[];
  onRowsChange: (rows: FinanceImportPreviewRow[]) => void;
}) {
  async function patchRow(index: number, patch: Partial<FinanceImportPreviewRow>) {
    const row = rows[index];
    if (!row?.stagingId) return;
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onRowsChange(next);
    await fetch(`/api/ops/finance/import/${importId}/staging/${row.stagingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionDate: patch.transactionDate,
        merchant: patch.merchant,
        description: patch.description,
        amount: patch.amount,
        proposedAccount: patch.proposedAccount,
      }),
    });
  }

  if (!rows.length) {
    return <p className="ops-finance-gt__note">No transactions in this statement.</p>;
  }

  return (
    <div className="ops-finance-gt__table-wrap">
      <table className="ops-finance-gt__table ops-finance-import__edit-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Merchant</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.stagingId ?? `${row.transactionDate}-${idx}`}>
              <td>
                <input
                  className="ops-finance-import__cell"
                  defaultValue={row.transactionDate}
                  onBlur={(e) => void patchRow(idx, { transactionDate: e.target.value })}
                />
              </td>
              <td>
                <input
                  className="ops-finance-import__cell"
                  defaultValue={row.merchant}
                  onBlur={(e) => void patchRow(idx, { merchant: e.target.value })}
                />
              </td>
              <td>
                <input
                  className="ops-finance-import__cell"
                  defaultValue={row.description}
                  onBlur={(e) => void patchRow(idx, { description: e.target.value })}
                />
              </td>
              <td>
                <input
                  className="ops-finance-import__cell"
                  type="number"
                  step="0.01"
                  defaultValue={row.amount}
                  onBlur={(e) => void patchRow(idx, { amount: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  className="ops-finance-import__cell"
                  defaultValue={row.proposedAccount ?? ""}
                  onBlur={(e) =>
                    void patchRow(idx, { proposedAccount: e.target.value || null })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FinanceImportClient({ history }: Props) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<ImportBatchPreview | null>(null);
  const [rows, setRows] = useState<FinanceImportPreviewRow[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState("");
  const [reconciliation, setReconciliation] = useState<ImportReconciliation | null>(null);
  const [postResult, setPostResult] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files];
      if (!list.length) return;

      setBusy(true);
      setError(null);
      setPostResult(null);
      const form = new FormData();
      for (const file of list) {
        form.append("files", file);
      }

      try {
        const res = await fetch("/api/ops/finance/import/preview", { method: "POST", body: form });
        const data = await readOpsJsonResponse<{ previews?: ImportBatchPreview[] }>(res);
        const first = data.previews?.[0];
        if (!first) throw new Error("Could not read that file");

        setBatch(first);
        setRows(first.rows);
        setWorkflowStatus(first.workflowStatus);
        setReconciliation(first.reconciliation);

        if (first.kind !== "orders" && first.workflowStatus === "parsed") {
          await fetch(`/api/ops/finance/import/${first.importId}/review`, { method: "POST" });
          setWorkflowStatus("reviewed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setBatch(null);
        setRows([]);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  async function runStep(path: string, onSuccess: (data: Record<string, unknown>) => void) {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await readOpsJsonResponse<Record<string, unknown>>(res);
      onSuccess(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const isPosted = workflowStatus === "posted" || batch?.workflowStatus === "posted";
  const isOrdersOnly = batch?.kind === "orders";
  const accountLabel = batch ? (SOURCE_LABELS[batch.source] ?? batch.source) : "";

  return (
    <div className="ops-finance-import">
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
          void uploadFiles(e.dataTransfer.files);
        }}
      >
        <p className="ops-finance-import__drop-title">Drop statement file here</p>
        <p className="ops-finance-import__drop-sub">
          Apple Card CSV · NEBAT PDF · PayPal CSV · Amazon order history CSV or PDF
        </p>
        <label className="ops-finance-import__browse">
          <input
            type="file"
            multiple
            accept=".csv,.pdf,text/csv,application/pdf"
            hidden
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
            }}
          />
          Choose file
        </label>
        {busy ? <p className="ops-finance-import__status">Reading file…</p> : null}
      </div>

      {batch ? (
        <section className="ops-finance-gt__section">
          <h2 className="ops-finance-gt__heading">Statement Preview</h2>
          <div className="ops-finance-import__summary-grid">
            <div>
              <span className="ops-finance__dim">Account</span>
              <strong>{accountLabel}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">Period</span>
              <strong>{fmtPeriod(reconciliation)}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">Beginning Balance</span>
              <strong>{fmtMoney(reconciliation?.beginningBalance ?? null)}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">Ending Balance</span>
              <strong>{fmtMoney(reconciliation?.endingBalance ?? null)}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">Transactions</span>
              <strong>{batch.rowCount}</strong>
            </div>
            <div>
              <span className="ops-finance__dim">Difference</span>
              <strong>{fmtMoney(reconciliation?.difference ?? null)}</strong>
            </div>
          </div>

          {isOrdersOnly ? (
            <p className="ops-finance-gt__note">{batch.note ?? "Amazon orders saved for reporting."}</p>
          ) : (
            <EditableGrid importId={batch.importId} rows={rows} onRowsChange={setRows} />
          )}

          {!isPosted && !isOrdersOnly ? (
            <div className="ops-finance-review__bulk">
              <button
                type="button"
                className="ops-finance-account__btn"
                disabled={busy || workflowStatus === "reconciled"}
                onClick={() =>
                  void runStep(`/api/ops/finance/import/${batch.importId}/reconcile`, (data) => {
                    setWorkflowStatus("reconciled");
                    if (data.reconciliation) {
                      setReconciliation(data.reconciliation as ImportReconciliation);
                    }
                  })
                }
              >
                Check Balance
              </button>
              <button
                type="button"
                className="ops-finance-account__btn ops-finance-account__btn--primary"
                disabled={busy || workflowStatus !== "reconciled"}
                onClick={() =>
                  void runStep(`/api/ops/finance/import/${batch.importId}/post`, (data) => {
                    setWorkflowStatus("posted");
                    setPostResult(
                      `${data.inserted ?? 0} posted · ${data.skipped ?? 0} skipped`,
                    );
                    setBatch(null);
                    setRows([]);
                  })
                }
              >
                Post
              </button>
              <button
                type="button"
                className="ops-finance-account__btn"
                disabled={busy}
                onClick={() => {
                  setBatch(null);
                  setRows([]);
                  setWorkflowStatus("");
                  setReconciliation(null);
                  setError(null);
                }}
              >
                Start Over
              </button>
            </div>
          ) : null}

          {isPosted && postResult ? (
            <p className="ops-finance-gt__note">Posted: {postResult}</p>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="ops-finance-import__error">{error}</p> : null}

      <section className="ops-finance-gt__section">
        <h2 className="ops-finance-gt__heading">Import History</h2>
        <div className="ops-finance-gt__table-wrap">
          <table className="ops-finance-gt__table">
            <thead>
              <tr>
                <th>Statement</th>
                <th>Status</th>
                <th>Detail</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {history.map((imp) => (
                <tr key={`import-history-${imp.id}`}>
                  <td>{imp.label}</td>
                  <td>{imp.statusLabel}</td>
                  <td>{imp.detail}</td>
                  <td>{imp.difference != null ? fmtMoney(imp.difference) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
