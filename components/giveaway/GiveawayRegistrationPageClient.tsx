"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { GiveawayRegistrationField } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  eventKey: string;
  giveawayId: string;
  headline: string;
  prizeTitle: string;
  prizeDescription: string;
  heroImageUrl: string | null;
  confirmationDefault: string;
  fields: GiveawayRegistrationField[];
};

type FormValues = Record<string, string | boolean>;

function initialValues(fields: GiveawayRegistrationField[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (!field.enabled) continue;
    values[field.id] = field.id === "newsletterOptIn" ? false : "";
  }
  return values;
}

export function GiveawayRegistrationPageClient(props: Props) {
  const searchParams = useSearchParams();
  const giveawayId = searchParams.get("g")?.trim() || props.giveawayId;
  const enabledFields = useMemo(
    () => props.fields.filter((field) => field.enabled),
    [props.fields],
  );
  const [values, setValues] = useState<FormValues>(() => initialValues(props.fields));
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField(id: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        eventKey: props.eventKey,
        giveawayId,
      };
      for (const field of enabledFields) {
        const value = values[field.id];
        if (field.id === "newsletterOptIn") {
          payload.newsletterOptIn = value === true;
        } else if (typeof value === "string" && value.trim()) {
          payload[field.id] = value.trim();
        } else if (field.required) {
          throw new Error(`${field.label} is required`);
        }
      }

      const res = await fetch("/api/giveaway/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { confirmationMessage?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setConfirmation(data.confirmationMessage ?? props.confirmationDefault);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (confirmation) {
    return (
      <main className="gv-register gv-register--confirmed">
        <p className="gv-register__kicker">You&apos;re in</p>
        <h1>{confirmation}</h1>
      </main>
    );
  }

  return (
    <main className="gv-register">
      <div className="gv-register__hero">
        {props.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.heroImageUrl} alt={props.prizeTitle} />
        ) : (
          <div className="gv-register__hero-placeholder">{props.prizeTitle}</div>
        )}
      </div>
      <section className="gv-register__panel">
        <p className="gv-register__kicker">Tonight&apos;s giveaway</p>
        <h1>{props.headline}</h1>
        <p>{props.prizeDescription}</p>
        <form className="gv-register__form" onSubmit={(e) => void submit(e)}>
          {enabledFields.map((field) => {
            if (field.id === "newsletterOptIn") {
              return (
                <label key={field.id} className="gv-register__checkbox">
                  <input
                    type="checkbox"
                    checked={values[field.id] === true}
                    onChange={(e) => setField(field.id, e.target.checked)}
                  />
                  {field.label}
                </label>
              );
            }

            const inputType =
              field.id === "email"
                ? "email"
                : field.id === "birthday"
                  ? "date"
                  : field.id === "phone"
                    ? "tel"
                    : "text";

            const fieldValue = values[field.id];
            const stringValue = typeof fieldValue === "string" ? fieldValue : "";

            return (
              <label key={field.id}>
                {field.label}
                <input
                  type={inputType}
                  required={field.required}
                  value={stringValue}
                  onChange={(e) => setField(field.id, e.target.value)}
                />
              </label>
            );
          })}
          <button type="submit" disabled={busy}>
            {busy ? "Entering…" : "Enter Giveaway"}
          </button>
          {error ? <p className="gv-register__error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
