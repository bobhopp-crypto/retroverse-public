"use client";

import { useState } from "react";

import type { Giveaway, GiveawayStatus } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  giveaway: Giveaway;
  registrationUrl: string;
};

export function GiveawaySettingsEditor({ giveaway, registrationUrl }: Props) {
  const [title, setTitle] = useState(giveaway.title);
  const [status, setStatus] = useState<GiveawayStatus>(giveaway.status);
  const [rules, setRules] = useState(giveaway.rules);
  const [scheduledDrawAt, setScheduledDrawAt] = useState(giveaway.scheduledDrawAt ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/event-studio/giveaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-settings",
          payload: {
            giveawayId: giveaway.id,
            title,
            status,
            rules,
            scheduledDrawAt: scheduledDrawAt.trim() || null,
          },
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage("Settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="es-giveaway-settings">
      <section className="ops-event-studio__panel es-giveaway-form" aria-label="Giveaway settings">
        <h2 className="ops-event-studio__panel-title">Giveaway Settings</h2>
        <label>
          Giveaway title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as GiveawayStatus)}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="drawing">Drawing</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Scheduled draw
          <input
            type="datetime-local"
            value={scheduledDrawAt}
            onChange={(e) => setScheduledDrawAt(e.target.value)}
          />
        </label>
        <label>
          Rules
          <textarea rows={4} value={rules} onChange={(e) => setRules(e.target.value)} />
        </label>
        <label>
          Registration URL
          <input value={registrationUrl} readOnly />
        </label>
        <div className="es-giveaway-form__actions">
          <button type="button" className="es-giveaway-btn es-giveaway-btn--primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save Settings"}
          </button>
          {message ? <p className="es-giveaway-form__message">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
