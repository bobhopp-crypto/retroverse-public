"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

export default function OpsPinClient() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/ops";
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/internal/ops-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setErr("Invalid PIN");
        setBusy(false);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/ops");
      router.refresh();
    } catch {
      setErr("Request failed");
      setBusy(false);
    }
  }

  return (
    <div className="ops-pin-card">
      <p className="ops-pin-card__kicker">Internal · backstage</p>
      <h1 className="ops-pin-card__title">Ops Access</h1>
      <p className="ops-pin-card__lead">Enter PIN to open the operations control room.</p>
      <form onSubmit={submit} className="ops-pin-form">
        <label className="ops-pin-form__label" htmlFor="ops-pin">
          Access code
        </label>
        <input
          id="ops-pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="ops-pin-form__input"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          maxLength={8}
        />
        {err ? <p className="ops-pin-form__error">{err}</p> : null}
        <button
          type="submit"
          disabled={busy || pin.length === 0}
          className="ops-pin-form__submit"
        >
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
