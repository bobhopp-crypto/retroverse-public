"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { FinanceAccount } from "@/lib/ops/finance/db/accounts";
import type { FinanceTransaction } from "@/lib/ops/finance/db/transactions";
import { FINANCE_IMPORTANCE_LEVELS } from "@/lib/ops/finance/finance-importance";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

const SOURCE_LABELS: Record<string, string> = {
  apple_card: "Apple Card",
  amazon: "Amazon",
  paypal: "PayPal",
  nebat: "NEBAT",
};

const TAX_OPTIONS = ["Personal", "Personal Income", "W-2 Income", "Business", "Transfer", "—"];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Props = {
  initialTransactions: FinanceTransaction[];
  accounts: FinanceAccount[];
};

type SortKey = "date" | "merchant" | "amount" | "account";

export function FinanceLedgerClient({ initialTransactions, accounts }: Props) {
  const [rows, setRows] = useState(initialTransactions);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [year, setYear] = useState("");
  const [source, setSource] = useState("");
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [bulkAccountId, setBulkAccountId] = useState("");

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (source) params.set("source", source);
    if (accountId) params.set("accountId", accountId);
    if (merchant) params.set("merchant", merchant);
    if (search) params.set("search", search);
    params.set("sort", sort);
    params.set("sortDir", sortDir);
    params.set("limit", "500");
    const res = await fetch(`/api/ops/finance/ledger?${params}`);
    const data = await readOpsJsonResponse<{ transactions: FinanceTransaction[] }>(res);
    setRows(data.transactions);
  }, [year, source, accountId, merchant, search, sort, sortDir]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function patchRow(id: number, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/ops/finance/ledger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: [id], ...patch }),
      });
      await readOpsJsonResponse(res);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function bulkApply(learnRule: boolean) {
    if (!selected.size || !bulkAccountId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/finance/ledger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionIds: [...selected],
          accountId: Number(bulkAccountId),
          learnRule,
        }),
      });
      await readOpsJsonResponse(res);
      setSelected(new Set());
      await reload();
    } finally {
      setBusy(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  return (
    <div className="ops-finance-ledger">
      <div className="ops-finance-review__bulk">
        <input
          className="ops-finance-import__browse"
          placeholder="Search merchant/description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="ops-finance-import__browse" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>
          {["2026", "2025", "2024", "2023", "2022", "2021"].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select className="ops-finance-import__browse" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="ops-finance-import__browse"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="">All accounts</option>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          className="ops-finance-import__browse"
          placeholder="Merchant filter"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />
      </div>

      {selected.size > 0 ? (
        <div className="ops-finance-review__bulk">
          <span>{selected.size} selected</span>
          <select
            className="ops-finance-import__browse"
            value={bulkAccountId}
            onChange={(e) => setBulkAccountId(e.target.value)}
          >
            <option value="">Bulk account…</option>
            {activeAccounts.map((a) => (
              <option key={`bulk-${a.id}`} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="button" className="ops-finance-review__btn" disabled={busy} onClick={() => void bulkApply(false)}>
            Apply account
          </button>
          <button type="button" className="ops-finance-review__btn ops-finance-review__btn--rule" disabled={busy} onClick={() => void bulkApply(true)}>
            Apply + Rule
          </button>
        </div>
      ) : null}

      <p className="ops-finance-review__lead">{rows.length} rows · income + expense + transfer</p>

      <div className="ops-finance-ledger__scroll">
        <table className="ops-finance-import__table ops-finance-ledger__table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                  }
                />
              </th>
              <th>
                <button type="button" className="ops-finance-ledger__sort" onClick={() => toggleSort("date")}>
                  Date {sort === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th>
                <button type="button" className="ops-finance-ledger__sort" onClick={() => toggleSort("merchant")}>
                  Merchant {sort === "merchant" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th>Description</th>
              <th>Source</th>
              <th>
                <button type="button" className="ops-finance-ledger__sort" onClick={() => toggleSort("account")}>
                  Account {sort === "account" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th>
                <button type="button" className="ops-finance-ledger__sort" onClick={() => toggleSort("amount")}>
                  Amount {sort === "amount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th>Flow</th>
              <th>Importance</th>
              <th>Tax</th>
              <th>Rule</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((txn) => (
              <tr key={`ledger-${txn.id}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(txn.id)}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(txn.id);
                        else next.delete(txn.id);
                        return next;
                      });
                    }}
                  />
                </td>
                <td>{txn.transactionDate}</td>
                <td>{txn.merchant}</td>
                <td className="ops-finance-ledger__desc">{txn.description}</td>
                <td>{SOURCE_LABELS[txn.source] ?? txn.source}</td>
                <td>
                  <select
                    className="ops-finance-ledger__select"
                    value={txn.accountId ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      void patchRow(txn.id, { accountId: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">—</option>
                    {activeAccounts.map((a) => (
                      <option key={`${txn.id}-acct-${a.id}`} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{fmt(txn.amount)}</td>
                <td>{txn.flowKind}</td>
                <td>
                  <select
                    className="ops-finance-ledger__select"
                    value={txn.importance ?? ""}
                    disabled={busy}
                    onChange={(e) => void patchRow(txn.id, { importance: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {FINANCE_IMPORTANCE_LEVELS.map((l) => (
                      <option key={`${txn.id}-imp-${l.id}`} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="ops-finance-ledger__select"
                    value={txn.taxTreatment ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      void patchRow(txn.id, { taxTreatment: e.target.value === "—" ? null : e.target.value })
                    }
                  >
                    {TAX_OPTIONS.map((t) => (
                      <option key={`${txn.id}-tax-${t}`} value={t === "—" ? "" : t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{txn.rulePattern ?? "—"}</td>
                <td>
                  <input
                    className="ops-finance-ledger__notes"
                    defaultValue={txn.notes ?? ""}
                    disabled={busy}
                    onBlur={(e) => {
                      if (e.target.value !== (txn.notes ?? "")) {
                        void patchRow(txn.id, { notes: e.target.value || null });
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
