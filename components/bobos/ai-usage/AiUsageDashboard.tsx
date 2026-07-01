"use client";

import { useMemo, useRef, useState } from "react";

import { addAiUsageEntry, importAiUsageCsv } from "@/app/bobos/ai/actions";
import { computeAiUsageSummary, topEntriesBySpend } from "@/lib/bobos/ai-usage/summary";
import {
  AI_USAGE_MODE_SUGGESTIONS,
  AI_USAGE_OUTCOME_SUGGESTIONS,
  AI_USAGE_PROVIDERS,
  AI_USAGE_TOOL_SUGGESTIONS,
  AI_USAGE_WORKFLOWS,
  type AiUsageEntry,
  type AiUsageProvider,
  type AiUsageWorkflow,
  type NewAiUsageEntryInput,
} from "@/lib/bobos/ai-usage/types";

import "./ai-usage.css";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: NewAiUsageEntryInput = {
  date: todayIso(),
  provider: "Cursor",
  tool: "",
  workflow: "Homepage",
  mode: "",
  costDollars: 0,
  creditsUsed: 0,
  notes: "",
  outcome: "",
};

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

type Props = {
  initialEntries: AiUsageEntry[];
};

export function AiUsageDashboard({ initialEntries }: Props) {
  const [entries, setEntries] = useState<AiUsageEntry[]>(initialEntries);
  const [form, setForm] = useState<NewAiUsageEntryInput>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => computeAiUsageSummary(entries), [entries]);
  const topWorkflows = useMemo(() => topEntriesBySpend(summary.workflowSpend), [summary]);
  const topProviders = useMemo(() => topEntriesBySpend(summary.providerSpend), [summary]);

  function field<K extends keyof NewAiUsageEntryInput>(key: K, value: NewAiUsageEntryInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAddEntry() {
    setBusy(true);
    setError(null);
    try {
      const next = await addAiUsageEntry(form);
      setEntries(next);
      setForm({ ...EMPTY_FORM, date: todayIso() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setBusy(false);
    }
  }

  async function handleCsvFile(file: File) {
    setBusy(true);
    setImportStatus(null);
    setError(null);
    try {
      const text = await file.text();
      const result = await importAiUsageCsv(text);
      setEntries(result.entries);
      setImportStatus(
        `Imported ${result.imported} row${result.imported === 1 ? "" : "s"}${
          result.skipped ? ` · skipped ${result.skipped}` : ""
        }`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="ai-usage">
      <header className="ai-usage__header">
        <h1>BobOS AI Usage</h1>
        <p>Manual cost &amp; credit tracker — local only, no billing API connections.</p>
      </header>

      <section className="ai-usage__cards" aria-label="Spend summary">
        <div className="ai-usage__card">
          <p className="ai-usage__card-label">Today</p>
          <p className="ai-usage__card-value">{formatUsd(summary.todaySpend)}</p>
        </div>
        <div className="ai-usage__card">
          <p className="ai-usage__card-label">This month</p>
          <p className="ai-usage__card-value">{formatUsd(summary.monthSpend)}</p>
        </div>
        <div className="ai-usage__card">
          <p className="ai-usage__card-label">Total</p>
          <p className="ai-usage__card-value">{formatUsd(summary.totalSpend)}</p>
        </div>
        <div className="ai-usage__card">
          <p className="ai-usage__card-label">Cursor</p>
          <p className="ai-usage__card-value">{formatUsd(summary.providerSpend.Cursor ?? 0)}</p>
        </div>
        <div className="ai-usage__card">
          <p className="ai-usage__card-label">ChatGPT</p>
          <p className="ai-usage__card-value">{formatUsd(summary.providerSpend.ChatGPT ?? 0)}</p>
        </div>
        <div className="ai-usage__card">
          <p className="ai-usage__card-label">v0</p>
          <p className="ai-usage__card-value">{formatUsd(summary.providerSpend.v0 ?? 0)}</p>
        </div>
        <div className="ai-usage__card">
          <p className="ai-usage__card-label">Local / free uses</p>
          <p className="ai-usage__card-value">{summary.localFreeCount}</p>
        </div>
      </section>

      <section className="ai-usage__breakdowns">
        <div className="ai-usage__breakdown">
          <h2>Spend by workflow</h2>
          {topWorkflows.length === 0 ? (
            <p className="ai-usage__empty">No entries yet.</p>
          ) : (
            <ul>
              {topWorkflows.map((row) => (
                <li key={row.key}>
                  <span>{row.key}</span>
                  <span>{formatUsd(row.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="ai-usage__breakdown">
          <h2>Spend by provider</h2>
          {topProviders.length === 0 ? (
            <p className="ai-usage__empty">No entries yet.</p>
          ) : (
            <ul>
              {topProviders.map((row) => (
                <li key={row.key}>
                  <span>{row.key}</span>
                  <span>{formatUsd(row.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="ai-usage__form" aria-label="Add usage entry">
        <h2>Add entry</h2>
        <div className="ai-usage__form-grid">
          <label>
            <span>Date</span>
            <input type="date" value={form.date} onChange={(e) => field("date", e.target.value)} />
          </label>

          <label>
            <span>Provider</span>
            <select value={form.provider} onChange={(e) => field("provider", e.target.value as AiUsageProvider)}>
              {AI_USAGE_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Tool / Model</span>
            <input
              type="text"
              list="ai-usage-tool-suggestions"
              value={form.tool}
              onChange={(e) => field("tool", e.target.value)}
            />
          </label>

          <label>
            <span>Workflow</span>
            <select value={form.workflow} onChange={(e) => field("workflow", e.target.value as AiUsageWorkflow)}>
              {AI_USAGE_WORKFLOWS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Mode</span>
            <input
              type="text"
              list="ai-usage-mode-suggestions"
              value={form.mode}
              onChange={(e) => field("mode", e.target.value)}
            />
          </label>

          <label>
            <span>Cost (dollars)</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.costDollars}
              onChange={(e) => field("costDollars", Number(e.target.value) || 0)}
            />
          </label>

          <label>
            <span>Credits used</span>
            <input
              type="number"
              step="1"
              min={0}
              value={form.creditsUsed}
              onChange={(e) => field("creditsUsed", Number(e.target.value) || 0)}
            />
          </label>

          <label>
            <span>Outcome</span>
            <input
              type="text"
              list="ai-usage-outcome-suggestions"
              value={form.outcome}
              onChange={(e) => field("outcome", e.target.value)}
            />
          </label>

          <label className="ai-usage__form-notes">
            <span>Notes</span>
            <textarea rows={2} value={form.notes} onChange={(e) => field("notes", e.target.value)} />
          </label>
        </div>

        <datalist id="ai-usage-tool-suggestions">
          {AI_USAGE_TOOL_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <datalist id="ai-usage-mode-suggestions">
          {AI_USAGE_MODE_SUGGESTIONS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id="ai-usage-outcome-suggestions">
          {AI_USAGE_OUTCOME_SUGGESTIONS.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>

        {error ? <p className="ai-usage__error">{error}</p> : null}

        <div className="ai-usage__form-actions">
          <button type="button" disabled={busy || !form.date} onClick={() => void handleAddEntry()}>
            {busy ? "Saving…" : "Add entry"}
          </button>

          <label className="ai-usage__csv-import">
            <span>Import CSV</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCsvFile(file);
              }}
            />
          </label>
        </div>
        {importStatus ? <p className="ai-usage__import-status">{importStatus}</p> : null}
      </section>

      <section className="ai-usage__table-wrap" aria-label="Recent usage entries">
        <h2>Recent sessions</h2>
        {entries.length === 0 ? (
          <p className="ai-usage__empty">No usage logged yet.</p>
        ) : (
          <table className="ai-usage__table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Provider</th>
                <th>Tool</th>
                <th>Workflow</th>
                <th>Mode</th>
                <th>Cost</th>
                <th>Credits</th>
                <th>Outcome</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 100).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date}</td>
                  <td>{entry.provider}</td>
                  <td>{entry.tool || "—"}</td>
                  <td>{entry.workflow}</td>
                  <td>{entry.mode || "—"}</td>
                  <td>{formatUsd(entry.costDollars)}</td>
                  <td>{entry.creditsUsed}</td>
                  <td>{entry.outcome || "—"}</td>
                  <td className="ai-usage__notes-cell">{entry.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
