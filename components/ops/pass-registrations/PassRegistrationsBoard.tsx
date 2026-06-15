"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpsPill, OpsTable } from "@/components/ops/OpsTable";
import type { CollectorPassRegistration } from "@/lib/collector-pass/registrations";
import { collectorPassRegistrationsToCsv } from "@/lib/collector-pass/registrations";
import { downloadTextFile } from "@/lib/ops/acquisition-export";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function PassRegistrationsBoard(props: {
  initialRegistrations: CollectorPassRegistration[];
  initialCount: number;
  pgOk: boolean;
  pgError?: string;
}) {
  const [registrations, setRegistrations] = useState(props.initialRegistrations);
  const [count, setCount] = useState(props.initialCount);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(props.pgOk ? null : props.pgError ?? "Postgres offline");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (query: string) => {
    if (!props.pgOk) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetch(`/api/ops/pass-registrations?${params.toString()}`);
      const data = (await res.json()) as {
        registrations?: CollectorPassRegistration[];
        count?: number;
        error?: string;
        pgOk?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setRegistrations(data.registrations ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [props.pgOk]);

  useEffect(() => {
    if (!props.pgOk) return;
    void load(debouncedSearch);
  }, [debouncedSearch, load, props.pgOk]);

  const tableRows = useMemo(
    () =>
      registrations.map((row) => ({
        id: String(row.id),
        cells: {
          pass: <strong>#{row.passNumber}</strong>,
          name: `${row.firstName} ${row.lastName}`,
          email: row.email ? (
            <a className="ops-link" href={`mailto:${row.email}`}>
              {row.email}
            </a>
          ) : (
            <span className="ops-dim">—</span>
          ),
          when: formatWhen(row.createdAt),
        },
      })),
    [registrations],
  );

  function exportCsv() {
    const csv = collectorPassRegistrationsToCsv(registrations);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`collector-pass-registrations-${stamp}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <section className="ops-pass-regs">
      <div className="ops-pass-regs__toolbar">
        <div className="ops-pass-regs__stats">
          <OpsPill tone={props.pgOk ? "ok" : "bad"}>
            {props.pgOk ? `${count} registration${count === 1 ? "" : "s"}` : "Postgres offline"}
          </OpsPill>
          {loading ? <span className="ops-dim">Loading…</span> : null}
        </div>
        <div className="ops-pass-regs__actions">
          <input
            className="ops-input ops-pass-regs__search"
            type="search"
            placeholder="Search pass #, name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search registrations"
          />
          <button
            type="button"
            className="ops-btn ops-btn--info"
            onClick={exportCsv}
            disabled={!props.pgOk || registrations.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error ? <p className="ops-banner ops-banner--warn">{error}</p> : null}

      <OpsTable
        columns={[
          { key: "pass", label: "Pass" },
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "when", label: "Registered", align: "right" },
        ]}
        rows={tableRows}
        empty={
          debouncedSearch
            ? "No registrations match this search."
            : "No collector pass registrations yet."
        }
      />
    </section>
  );
}
