"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { FinanceAmazonImportReport } from "@/lib/ops/finance/finance-canonical-model";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type UploadResponse = {
  report?: FinanceAmazonImportReport;
  results?: { fileName: string; format: "pdf" | "csv" }[];
};

export function FinanceAmazonImportClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FinanceAmazonImportReport | null>(null);
  const [lastFormat, setLastFormat] = useState<"pdf" | "csv" | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files].filter((f) => /\.(csv|pdf)$/i.test(f.name));
      if (!list.length) {
        setError("Select one or more CSV or PDF files");
        return;
      }
      setBusy(true);
      setError(null);
      const form = new FormData();
      for (const file of list) form.append("files", file);

      try {
        const res = await fetch("/api/ops/finance/import-amazon", { method: "POST", body: form });
        const data = await readOpsJsonResponse<UploadResponse>(res);
        setReport(data.report ?? null);
        setLastFormat(data.results?.[0]?.format ?? null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return (
    <div className="ops-finance-import">
      <section className="ops-finance-import__results" style={{ marginBottom: "1.5rem" }}>
        <h2 className="ops-finance__panel-title">Recommended: Order History CSV</h2>
        <p className="ops-finance-import__drop-sub">
          Amazon → Account → Order History Reports → Request report → download CSV. One file can cover years of
          orders. Apple Card imports at{" "}
          <a className="ops-link" href="/ops/finance/import">
            Import Center
          </a>{" "}
          already capture most Amazon charges for cashflow.
        </p>
        <ol className="ops-finance__lines" style={{ marginTop: "0.75rem" }}>
          <li>Your Account → Order History Reports</li>
          <li>Request report (all orders or date range)</li>
          <li>Download CSV when ready</li>
          <li>Drop CSV below (not individual invoice PDFs)</li>
        </ol>
      </section>

      <div
        className="ops-finance-import__drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }}
      >
        <p className="ops-finance-import__drop-title">Drop Amazon Order History CSV</p>
        <p className="ops-finance-import__drop-sub">Optional: printed Your Orders PDF (less reliable, fewer fields)</p>
        <label className="ops-finance-import__browse">
          <input
            type="file"
            multiple
            accept=".csv,.pdf,text/csv,application/pdf"
            hidden
            onChange={(e) => {
              if (e.target.files) void upload(e.target.files);
            }}
          />
          Choose CSV or PDF
        </label>
        {busy ? <p className="ops-finance-import__status">Parsing file…</p> : null}
        {error ? (
          <pre className="ops-finance-import__error" style={{ whiteSpace: "pre-wrap", textAlign: "left" }}>
            {error}
          </pre>
        ) : null}
      </div>

      {report ? (
        <section className="ops-finance-import__results">
          <h2 className="ops-finance__panel-title">Import report{lastFormat ? ` (${lastFormat})` : ""}</h2>
          <ul>
            <li>{report.ordersImported} orders imported</li>
            <li>{report.itemsImported} items imported</li>
            <li>{report.duplicatesSkipped} duplicates skipped</li>
            <li>Total spend parsed: {fmt(report.totalSpend)}</li>
          </ul>
          <h3 className="ops-finance__opp-heading">Spend by category</h3>
          <ul className="ops-finance__lines">
            {report.spendByCategory.map((row) => (
              <li key={`amazon-cat-${row.category}`}>
                <span>{row.category}</span>
                <strong>{fmt(row.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
