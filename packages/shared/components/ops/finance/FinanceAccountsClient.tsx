"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  sortFinanceAccountsByName,
  type FinanceAccount,
} from "@/lib/ops/finance/finance-account";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Props = {
  accounts: FinanceAccount[];
};

export function FinanceAccountsClient({ accounts: initial }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(q));
  }, [accounts, filter]);

  const refresh = useCallback(() => router.refresh(), [router]);

  async function patchAccount(id: number, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/finance/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readOpsJsonResponse<{ account?: FinanceAccount }>(res);
      if (data.account) {
        setAccounts((prev) =>
          sortFinanceAccountsByName(prev.map((a) => (a.id === data.account!.id ? data.account! : a))),
        );
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addAccount() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await readOpsJsonResponse<{ account: FinanceAccount }>(res);
      setAccounts((prev) => sortFinanceAccountsByName([...prev, data.account]));
      setNewName("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-finance-accounts">
      <p className="ops-finance-review__lead">
        {accounts.length} accounts from workbook Chart of Accounts (APPLE column E)
      </p>

      <div className="ops-finance-review__bulk">
        <input
          className="ops-finance-import__browse"
          placeholder="New account name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="button" className="ops-finance-review__btn" disabled={busy} onClick={() => void addAccount()}>
          Add account
        </button>
        <input
          className="ops-finance-import__browse"
          placeholder="Filter accounts"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {error ? <p className="ops-finance-import__error">{error}</p> : null}

      {mergeSourceId ? (
        <div className="ops-finance-review__bulk">
          <span>Merge into:</span>
          {accounts
            .filter((a) => a.id !== mergeSourceId && a.active)
            .slice(0, 12)
            .map((target) => (
              <button
                key={`merge-${target.id}`}
                type="button"
                className="ops-finance-review__btn"
                disabled={busy}
                onClick={() =>
                  void patchAccount(mergeSourceId, { mergeIntoId: target.id }).then(() => {
                    setAccounts((prev) => prev.filter((a) => a.id !== mergeSourceId));
                    setMergeSourceId(null);
                  })
                }
              >
                {target.name}
              </button>
            ))}
          <button type="button" className="ops-finance-review__btn" onClick={() => setMergeSourceId(null)}>
            Cancel
          </button>
        </div>
      ) : null}

      <table className="ops-finance-import__table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Transactions</th>
            <th>Total spend</th>
            <th>Workbook rows</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((account) => (
            <tr key={`acct-${account.id}`}>
              <td>
                {renameId === account.id ? (
                  <span className="ops-finance-review__bulk">
                    <input
                      className="ops-finance-import__browse"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                    <button
                      type="button"
                      className="ops-finance-review__btn ops-finance-review__btn--small"
                      disabled={busy}
                      onClick={() =>
                        void patchAccount(account.id, { name: renameValue }).then(() => setRenameId(null))
                      }
                    >
                      Save
                    </button>
                  </span>
                ) : (
                  <strong>{account.name}</strong>
                )}
              </td>
              <td>{account.txnCount}</td>
              <td>{fmt(account.totalSpend)}</td>
              <td>{account.workbookTxnCount}</td>
              <td>{account.active ? "Active" : "Inactive"}</td>
              <td>
                <button
                  type="button"
                  className="ops-finance-review__btn ops-finance-review__btn--small"
                  disabled={busy}
                  onClick={() => {
                    setRenameId(account.id);
                    setRenameValue(account.name);
                  }}
                >
                  Rename
                </button>{" "}
                <button
                  type="button"
                  className="ops-finance-review__btn ops-finance-review__btn--small"
                  disabled={busy}
                  onClick={() => setMergeSourceId(account.id)}
                >
                  Merge
                </button>{" "}
                <button
                  type="button"
                  className="ops-finance-review__btn ops-finance-review__btn--small"
                  disabled={busy}
                  onClick={() => void patchAccount(account.id, { active: !account.active })}
                >
                  {account.active ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
