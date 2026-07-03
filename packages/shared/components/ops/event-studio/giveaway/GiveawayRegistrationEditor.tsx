"use client";

import { useState } from "react";

import type { Giveaway, GiveawayRegistrationConfig, GiveawayRegistrationField } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  giveaway: Giveaway;
};

export function GiveawayRegistrationEditor({ giveaway }: Props) {
  const [registration, setRegistration] = useState<GiveawayRegistrationConfig>(giveaway.registration);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateField(id: GiveawayRegistrationField["id"], patch: Partial<GiveawayRegistrationField>) {
    setRegistration((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/event-studio/giveaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-registration",
          payload: { giveawayId: giveaway.id, registration },
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage("Registration settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="es-giveaway-registration">
      <section className="ops-event-studio__panel es-giveaway-form" aria-label="Registration copy">
        <h2 className="ops-event-studio__panel-title">Registration Copy</h2>
        <label>
          Headline
          <input
            value={registration.headline}
            onChange={(e) => setRegistration({ ...registration, headline: e.target.value })}
          />
        </label>
        <label>
          Confirmation message
          <textarea
            rows={3}
            value={registration.confirmationMessage}
            onChange={(e) => setRegistration({ ...registration, confirmationMessage: e.target.value })}
          />
        </label>
      </section>

      <section className="ops-event-studio__panel" aria-label="Registration fields">
        <h2 className="ops-event-studio__panel-title">Fields</h2>
        <p className="ops-event-studio__hint">Toggle what guests must fill out when they scan the QR code.</p>
        <div className="es-giveaway-field-grid">
          {registration.fields.map((field) => (
            <article key={field.id} className="es-giveaway-field-card">
              <h3>{field.label}</h3>
              <label className="es-giveaway-check">
                <input
                  type="checkbox"
                  checked={field.enabled}
                  onChange={(e) => updateField(field.id, { enabled: e.target.checked, required: e.target.checked ? field.required : false })}
                />
                Enabled
              </label>
              <label className="es-giveaway-check">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={!field.enabled || field.id === "firstName"}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                />
                Required
              </label>
            </article>
          ))}
        </div>
        <div className="es-giveaway-form__actions">
          <button type="button" className="es-giveaway-btn es-giveaway-btn--primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save Registration"}
          </button>
          {message ? <p className="es-giveaway-form__message">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
