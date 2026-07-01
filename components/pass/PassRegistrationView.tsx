"use client";

import { useState } from "react";

import { registerPass } from "@/app/pass/[serial]/actions";
import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";

import "./pass-registration.css";

type View = "form" | "already" | "confirmed";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  notes: string;
  giveawayOptIn: boolean;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  notes: "",
  giveawayOptIn: false,
};

function statusLabel(status: GeneratedPass["status"]): string {
  switch (status) {
    case "registered":
      return "Registered";
    case "checked_in":
      return "Checked In";
    case "archived":
      return "Archived";
    default:
      return "Available";
  }
}

type Props = {
  pass: GeneratedPass;
};

export function PassRegistrationView({ pass: initialPass }: Props) {
  const [pass, setPass] = useState(initialPass);
  const [view, setView] = useState<View>(initialPass.status === "registered" ? "already" : "form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await registerPass({ serial: pass.serial, ...form });
      setPass(updated);
      setView("confirmed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pass-reg">
      <section className="pass-reg__card">
        <p className="pass-reg__kicker">Event Pass</p>
        <h1 className="pass-reg__event">{pass.eventName}</h1>

        <dl className="pass-reg__meta">
          <div>
            <dt>Pass Number</dt>
            <dd>{pass.serial}</dd>
          </div>
          <div>
            <dt>Pass Type</dt>
            <dd>{pass.passType}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={`pass-reg__status pass-reg__status--${pass.status}`}>{statusLabel(pass.status)}</dd>
          </div>
        </dl>

        {view === "already" ? (
          <div className="pass-reg__already">
            <p className="pass-reg__already-title">Already Registered</p>
            {pass.registration ? (
              <p className="pass-reg__already-detail">
                Registered by {pass.registration.firstName}
                {pass.registration.lastName ? ` ${pass.registration.lastName}` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {view === "confirmed" ? (
          <div className="pass-reg__confirmed">
            <p className="pass-reg__confirmed-title">✓ Registration Complete</p>
            <p className="pass-reg__confirmed-detail">
              Pass {pass.serial} · {pass.eventName}
            </p>
            <p className="pass-reg__confirmed-message">You&apos;re all set. See you at the show.</p>
          </div>
        ) : null}

        {view === "form" ? (
          <form className="pass-reg__form" onSubmit={(e) => void handleSubmit(e)}>
            <label>
              <span>First Name</span>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => field("firstName", e.target.value)}
              />
            </label>

            <label>
              <span>Last Name</span>
              <input type="text" value={form.lastName} onChange={(e) => field("lastName", e.target.value)} />
            </label>

            <label>
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => field("email", e.target.value)} />
            </label>

            <label>
              <span>Phone</span>
              <input type="tel" value={form.phone} onChange={(e) => field("phone", e.target.value)} />
            </label>

            <label>
              <span>City</span>
              <input type="text" value={form.city} onChange={(e) => field("city", e.target.value)} />
            </label>

            <label>
              <span>Notes</span>
              <textarea rows={2} value={form.notes} onChange={(e) => field("notes", e.target.value)} />
            </label>

            <label className="pass-reg__checkbox">
              <input
                type="checkbox"
                checked={form.giveawayOptIn}
                onChange={(e) => field("giveawayOptIn", e.target.checked)}
              />
              <span>Enter me into the giveaway.</span>
            </label>

            {error ? <p className="pass-reg__error">{error}</p> : null}

            <button type="submit" disabled={busy || !form.firstName.trim()}>
              {busy ? "Saving…" : "Complete Registration"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
