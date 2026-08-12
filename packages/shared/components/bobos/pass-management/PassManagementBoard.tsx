"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpsPill, OpsTable } from "@/components/ops/OpsTable";
import type {
  PassActivityRow,
  PassManagementRow,
  PassManagementSummary,
} from "@/lib/retroverse-pass/pass-management";

/** Deterministic UTC formatting — avoids server/client TZ hydration mismatches. */
function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function publicPassHref(serial: string): string {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return `http://localhost:3100/pass/${encodeURIComponent(serial)}`;
  }
  return `https://retroverse.live/pass/${encodeURIComponent(serial)}`;
}

function visitorName(row: PassManagementRow): string {
  if (!row.claimed) return "—";
  const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
  return name || "—";
}

export function PassManagementBoard(props: {
  initialPasses: PassManagementRow[];
  initialSummary: PassManagementSummary;
  pgOk: boolean;
}) {
  const [passes, setPasses] = useState(props.initialPasses);
  const [summary, setSummary] = useState(props.initialSummary);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(props.pgOk ? null : "Postgres offline");
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<PassActivityRow[]>([]);

  const selected = useMemo(
    () => passes.find((row) => row.serial === selectedSerial) ?? null,
    [passes, selectedSerial],
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serialEdit, setSerialEdit] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selected) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSerialEdit("");
      setActivity([]);
      return;
    }
    setFirstName(selected.firstName ?? "");
    setLastName(selected.lastName ?? "");
    setEmail(selected.email ?? "");
    setPhone(selected.phone ?? "");
    setSerialEdit(selected.serial);
    setMsg(null);
  }, [selected]);

  const load = useCallback(
    async (query: string) => {
      if (!props.pgOk) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        const res = await fetch(`/api/bobos/pass-management?${params.toString()}`);
        const data = (await res.json()) as {
          passes?: PassManagementRow[];
          summary?: PassManagementSummary;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        setPasses(data.passes ?? []);
        if (data.summary) setSummary(data.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [props.pgOk],
  );

  const loadActivity = useCallback(async (serial: string) => {
    try {
      const params = new URLSearchParams({ serial, activity: "1" });
      const res = await fetch(`/api/bobos/pass-management?${params.toString()}`);
      const data = (await res.json()) as { events?: PassActivityRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setActivity(data.events ?? []);
    } catch {
      setActivity([]);
    }
  }, []);

  useEffect(() => {
    if (!props.pgOk) return;
    void load(debouncedSearch);
  }, [debouncedSearch, load, props.pgOk]);

  useEffect(() => {
    if (!selectedSerial || !props.pgOk) return;
    void loadActivity(selectedSerial);
  }, [selectedSerial, loadActivity, props.pgOk]);

  async function saveMember() {
    if (!selected) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/bobos/pass-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "member",
          serial: selected.serial,
          firstName,
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setMsg({ tone: "ok", text: "Visitor saved." });
      await load(debouncedSearch);
      await loadActivity(selected.serial);
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function saveSerial() {
    if (!selected) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/bobos/pass-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "serial",
          serial: selected.serial,
          nextSerial: serialEdit,
        }),
      });
      const data = (await res.json()) as { error?: string; pass?: PassManagementRow };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setMsg({ tone: "ok", text: "Pass serial saved." });
      if (data.pass?.serial) setSelectedSerial(data.pass.serial);
      await load(debouncedSearch);
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function resetClaim() {
    if (!selected) return;
    const ok = window.confirm(
      `Reset claim for pass ${selected.serial}? The visitor link will be cleared and /pass/${selected.serial} will show registration again.`,
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/bobos/pass-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", serial: selected.serial }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setMsg({ tone: "ok", text: "Claim reset — pass is unclaimed." });
      await load(debouncedSearch);
      await loadActivity(selected.serial);
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function deletePassRow() {
    if (!selected) return;
    const typed = window.prompt(
      `Type the pass serial exactly to permanently delete it:\n${selected.serial}`,
    );
    if (typed !== selected.serial) {
      if (typed != null) setMsg({ tone: "err", text: "Delete cancelled — serial did not match." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/bobos/pass-management", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: selected.serial, confirm: selected.serial }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setSelectedSerial(null);
      setMsg({ tone: "ok", text: "Pass deleted." });
      await load(debouncedSearch);
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  const tableRows = useMemo(
    () =>
      passes.map((row) => ({
        id: row.serial,
        className: row.serial === selectedSerial ? "ops-tr--selected" : "",
        onClick: () => setSelectedSerial(row.serial),
        cells: {
          pass: <strong>{row.serial}</strong>,
          status: (
            <span
              className={`pm-status ${
                row.claimed ? "pm-status--registered" : "pm-status--unregistered"
              }`}
            >
              {row.claimed ? "Claimed" : "Unclaimed"}
            </span>
          ),
          name: visitorName(row),
          email: row.email || <span className="ops-dim">—</span>,
          when: formatWhen(row.claimedAt),
          actions: (
            <div className="pm-actions-cell">
              <button
                type="button"
                className="ops-btn ops-btn--info"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSerial(row.serial);
                }}
              >
                Open
              </button>
            </div>
          ),
        },
      })),
    [passes, selectedSerial],
  );

  return (
    <section className="pm-board">
      <div className="pm-summary" aria-label="Pass summary">
        <div className="pm-stat">
          <span className="pm-stat__label">Total Passes</span>
          <span className="pm-stat__value">{summary.totalPasses}</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat__label">Claimed</span>
          <span className="pm-stat__value">{summary.claimed}</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat__label">Unclaimed</span>
          <span className="pm-stat__value">{summary.unclaimed}</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat__label">Claimed Today</span>
          <span className="pm-stat__value">{summary.claimedToday}</span>
        </div>
      </div>

      <div className="pm-toolbar">
        <div>
          <OpsPill tone={props.pgOk ? "info" : "bad"}>
            {props.pgOk
              ? `Showing ${passes.length}${loading ? " · Loading…" : ""}`
              : "Postgres offline"}
          </OpsPill>
        </div>
        <input
          className="ops-input pm-search"
          type="search"
          placeholder="Search serial, first name, last name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search passes"
          disabled={!props.pgOk}
        />
      </div>

      {error ? <p className="ops-banner ops-banner--warn">{error}</p> : null}

      <div className={`pm-layout${selected ? " pm-layout--split" : ""}`}>
        <div className="pm-tablewrap">
          <OpsTable
            columns={[
              { key: "pass", label: "Serial" },
              { key: "status", label: "Status" },
              { key: "name", label: "Visitor" },
              { key: "email", label: "Email" },
              { key: "when", label: "Claimed" },
              { key: "actions", label: "Actions", align: "right" },
            ]}
            rows={tableRows}
            empty={
              debouncedSearch
                ? "No passes match this search."
                : "No passes in retroverse_passes yet."
            }
          />
        </div>

        {selected ? (
          <aside className="pm-detail" aria-label="Pass detail">
            <div className="pm-detail__head">
              <h2 className="pm-detail__title">{selected.serial}</h2>
              <button
                type="button"
                className="pm-detail__close"
                onClick={() => setSelectedSerial(null)}
              >
                Close
              </button>
            </div>

            <p className="pm-meta">
              Status: <strong>{selected.claimed ? "Claimed" : "Unclaimed"}</strong>
              {" · "}
              Claimed: {formatWhen(selected.claimedAt)}
            </p>

            <label className="pm-field">
              <span>First name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!selected.claimed}
              />
            </label>
            <label className="pm-field">
              <span>Last name</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!selected.claimed}
              />
            </label>
            <label className="pm-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!selected.claimed}
                placeholder="optional"
              />
            </label>
            <label className="pm-field">
              <span>Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!selected.claimed}
                placeholder="optional"
              />
            </label>
            <label className="pm-field">
              <span>Pass serial</span>
              <input value={serialEdit} onChange={(e) => setSerialEdit(e.target.value)} />
            </label>

            {msg ? (
              <p className={`pm-msg ${msg.tone === "ok" ? "pm-msg--ok" : "pm-msg--err"}`}>
                {msg.text}
              </p>
            ) : null}

            <div className="pm-detail__actions">
              <button
                type="button"
                className="ops-btn ops-btn--ok pm-btn-primary"
                disabled={busy || !selected.claimed}
                onClick={() => void saveMember()}
              >
                Save visitor
              </button>
              <button
                type="button"
                className="ops-btn ops-btn--info"
                disabled={busy}
                onClick={() => void saveSerial()}
              >
                Save serial
              </button>
              <a
                className="ops-btn ops-btn--info"
                href={publicPassHref(selected.serial)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open public page
              </a>
              <button
                type="button"
                className="ops-btn ops-btn--warn"
                disabled={busy || !selected.claimed}
                onClick={() => void resetClaim()}
              >
                Reset claim
              </button>
              <button
                type="button"
                className="ops-btn ops-btn--bad"
                disabled={busy}
                onClick={() => void deletePassRow()}
              >
                Delete pass
              </button>
            </div>

            {activity.length > 0 ? (
              <div className="pm-activity">
                <p className="pm-stat__label">Recent activity</p>
                <ul>
                  {activity.slice(0, 8).map((event) => (
                    <li key={event.id}>
                      <strong>{event.eventType}</strong> · {formatWhen(event.createdAt)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
