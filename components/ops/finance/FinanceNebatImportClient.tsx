"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

type UploadResult = {
  fileName: string;
  kind: "checking" | "mortgage";
  inserted: number;
  skipped: number;
  transactionCount: number;
};

export function FinanceNebatImportClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files].filter((f) => f.name.toLowerCase().endsWith(".pdf"));
      if (!list.length) {
        setError("Select NEBAT PDF statement(s)");
        return;
      }
      setBusy(true);
      setError(null);
      const form = new FormData();
      for (const file of list) form.append("files", file);

      try {
        const res = await fetch("/api/ops/finance/import-nebat", { method: "POST", body: form });
        const data = await readOpsJsonResponse<{ results?: UploadResult[] }>(res);
        setResults(data.results ?? []);
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
      <p className="ops-finance-import__drop-sub">
        Upload National Exchange Bank checking or mortgage loan PDFs. Checking imports transactions;
        mortgage imports payment breakdown to mortgage statement table.
      </p>
      <div
        className="ops-finance-import__drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }}
      >
        <p className="ops-finance-import__drop-title">Drop NEBAT PDF statements</p>
        <label className="ops-finance-import__browse">
          <input
            type="file"
            multiple
            accept=".pdf,application/pdf"
            hidden
            onChange={(e) => {
              if (e.target.files) void upload(e.target.files);
            }}
          />
          Choose PDFs
        </label>
        {busy ? <p className="ops-finance-import__status">Parsing PDF…</p> : null}
        {error ? <pre className="ops-finance-import__error">{error}</pre> : null}
      </div>
      {results.length ? (
        <ul className="ops-finance__lines">
          {results.map((r) => (
            <li key={r.fileName}>
              <strong>{r.fileName}</strong> ({r.kind}) — inserted {r.inserted}, skipped {r.skipped}
              {r.kind === "checking" ? `, parsed ${r.transactionCount} rows` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
