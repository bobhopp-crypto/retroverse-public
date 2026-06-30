"use client";

import { useCallback, useEffect, useState } from "react";

import type { Giveaway, GiveawayEntry } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  giveaway: Giveaway;
  initialEntries: GiveawayEntry[];
  initialCount: number;
  initialDuplicateCount: number;
};

export function GiveawayAudienceBoard({
  giveaway,
  initialEntries,
  initialCount,
  initialDuplicateCount,
}: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [count, setCount] = useState(initialCount);
  const [duplicateCount, setDuplicateCount] = useState(initialDuplicateCount);
  const [search, setSearch] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async (query = search) => {
    const params = new URLSearchParams({ giveawayId: giveaway.id });
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/ops/event-studio/giveaway/entries?${params}`);
    const data = (await res.json()) as {
      entries?: GiveawayEntry[];
      count?: number;
      duplicateCount?: number;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "Load failed");
    setEntries(data.entries ?? []);
    setCount(data.count ?? 0);
    setDuplicateCount(data.duplicateCount ?? 0);
  }, [giveaway.id, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload(search).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, reload]);

  async function addManual() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/event-studio/giveaway/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giveawayId: giveaway.id,
          firstName,
          email: email || undefined,
          phone: phone || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Add failed");
      setFirstName("");
      setEmail("");
      setPhone("");
      await reload();
      setMessage("Entry added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="es-giveaway-audience">
      <div className="es-giveaway-stats">
        <article className="es-giveaway-stat">
          <span>Total entries</span>
          <strong>{count}</strong>
        </article>
        <article className="es-giveaway-stat">
          <span>Duplicates flagged</span>
          <strong>{duplicateCount}</strong>
        </article>
        <article className="es-giveaway-stat">
          <span>Recent loaded</span>
          <strong>{entries.length}</strong>
        </article>
      </div>

      <section className="ops-event-studio__panel es-giveaway-form" aria-label="Manual add">
        <h2 className="ops-event-studio__panel-title">Manual Add</h2>
        <div className="es-giveaway-form__row">
          <label>
            First name
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>
        <div className="es-giveaway-form__actions">
          <button
            type="button"
            className="es-giveaway-btn es-giveaway-btn--primary"
            disabled={busy || !firstName.trim()}
            onClick={() => void addManual()}
          >
            Add Entry
          </button>
          {message ? <p className="es-giveaway-form__message">{message}</p> : null}
        </div>
      </section>

      <section className="ops-event-studio__panel" aria-label="Audience list">
        <div className="es-giveaway-list-head">
          <h2 className="ops-event-studio__panel-title">Live List</h2>
          <input
            className="es-giveaway-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audience…"
          />
        </div>
        <div className="es-giveaway-list">
          {entries.length === 0 ? (
            <p className="es-giveaway-empty">No entries yet. Add manually or share the registration URL.</p>
          ) : (
            entries.map((entry) => (
              <article
                key={entry.id}
                className={`es-giveaway-entry${entry.duplicateOf ? " es-giveaway-entry--duplicate" : ""}`}
              >
                <div>
                  <strong>
                    {entry.firstName} {entry.lastName}
                  </strong>
                  <p>
                    {[entry.email, entry.phone].filter(Boolean).join(" · ") || entry.source}
                  </p>
                </div>
                <div className="es-giveaway-entry__meta">
                  {entry.duplicateOf ? <span className="es-giveaway-badge">Duplicate</span> : null}
                  <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleTimeString()}</time>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
