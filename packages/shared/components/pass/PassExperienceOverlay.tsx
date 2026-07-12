"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { PassScanResult, RetroverseVisitor } from "@/lib/retroverse-pass/types";

import "./pass-experience-overlay.css";

/**
 * Pass Experience overlay — sits on top of the live broadcast.
 *
 * First scan: claim form (first name, email, optional phone).
 * Returning: lightweight welcome-back panel.
 * Dismissing always returns straight to the broadcast underneath —
 * the visitor never leaves Retroverse Live.
 */

type View = "claim" | "confirmed" | "welcome" | "mypass" | "closed";

type Props = {
  scan: PassScanResult;
  currentEventTitle: string | null;
};

async function recordActivity(input: {
  serial: string;
  visitorId: number | null;
  eventType: string;
}): Promise<void> {
  try {
    await fetch("/api/pass/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // Activity logging must never block the visitor experience.
  }
}

export function PassExperienceOverlay({ scan, currentEventTitle }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>(scan.state === "claimed" ? "welcome" : "claim");
  const [visitor, setVisitor] = useState<RetroverseVisitor | null>(
    scan.state === "claimed" ? scan.visitor : null,
  );

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serial = scan.pass.serial;

  const dismiss = useCallback(() => {
    setView("closed");
    // Land the visitor on the live homepage without remounting the broadcast.
    window.history.replaceState(null, "", "/");
  }, []);

  useEffect(() => {
    if (view === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, dismiss]);

  useEffect(() => {
    if (view !== "confirmed") return;
    const timer = window.setTimeout(dismiss, 1800);
    return () => window.clearTimeout(timer);
  }, [view, dismiss]);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pass/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial, firstName, email, phone }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        visitor?: RetroverseVisitor;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.visitor) {
        throw new Error(data.error ?? "Claim failed. Please try again.");
      }
      setVisitor(data.visitor);
      setView("confirmed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleSearch() {
    void recordActivity({ serial, visitorId: visitor?.id ?? null, eventType: "SEARCH" });
    router.push("/search");
  }

  if (view === "closed") return null;

  return (
    <div className="pass-xp" role="presentation">
      <button
        type="button"
        className="pass-xp__backdrop"
        aria-label="Return to the broadcast"
        tabIndex={-1}
        onClick={dismiss}
      />

      <section
        className="pass-xp__card"
        role="dialog"
        aria-modal="true"
        aria-label={`Retroverse Pass ${serial}`}
      >
        {view === "claim" ? (
          <>
            <p className="pass-xp__kicker">Retroverse Pass</p>
            <h1 className="pass-xp__title">Welcome to Retroverse</h1>
            <p className="pass-xp__serial">Credential {serial}</p>

            <form className="pass-xp__form" onSubmit={(e) => void handleClaim(e)}>
              <label>
                <span>First Name</span>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                <span>Phone (optional)</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              {error ? <p className="pass-xp__error">{error}</p> : null}

              <button
                type="submit"
                className="pass-xp__primary"
                disabled={busy || !firstName.trim() || !email.trim()}
              >
                {busy ? "Claiming…" : "Claim My Pass"}
              </button>
            </form>

            <button type="button" className="pass-xp__skip" onClick={dismiss}>
              Not now — take me to the show
            </button>
          </>
        ) : null}

        {view === "confirmed" ? (
          <div className="pass-xp__confirmed">
            <p className="pass-xp__kicker">Credential {serial} claimed</p>
            <h1 className="pass-xp__title">
              You&apos;re in{visitor ? `, ${visitor.firstName}` : ""}.
            </h1>
            <p className="pass-xp__note">Returning you to the show…</p>
          </div>
        ) : null}

        {view === "welcome" ? (
          <>
            <p className="pass-xp__kicker">Retroverse Pass</p>
            <h1 className="pass-xp__title">
              Welcome back{visitor ? `, ${visitor.firstName}` : ""}.
            </h1>
            <p className="pass-xp__serial">Credential {serial}</p>

            {currentEventTitle ? (
              <div className="pass-xp__event">
                <span className="pass-xp__event-label">Current Event</span>
                <span className="pass-xp__event-title">{currentEventTitle}</span>
              </div>
            ) : null}

            <div className="pass-xp__actions">
              <button type="button" className="pass-xp__primary" onClick={dismiss}>
                Continue Watching
              </button>
              <div className="pass-xp__secondary-row">
                <button type="button" className="pass-xp__secondary" onClick={handleSearch}>
                  Search
                </button>
                <button
                  type="button"
                  className="pass-xp__secondary"
                  onClick={() => setView("mypass")}
                >
                  My Pass
                </button>
              </div>
            </div>
          </>
        ) : null}

        {view === "mypass" ? (
          <>
            <p className="pass-xp__kicker">My Pass</p>
            <h1 className="pass-xp__title">Credential {serial}</h1>

            <dl className="pass-xp__details">
              <div>
                <dt>Serial</dt>
                <dd>{serial}</dd>
              </div>
              <div>
                <dt>Holder</dt>
                <dd>{visitor?.firstName ?? "—"}</dd>
              </div>
              <div>
                <dt>Claimed</dt>
                <dd>
                  {scan.pass.claimedAt
                    ? new Date(scan.pass.claimedAt).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="pass-xp__actions">
              <button type="button" className="pass-xp__primary" onClick={dismiss}>
                Continue Watching
              </button>
              <button
                type="button"
                className="pass-xp__skip"
                onClick={() => setView("welcome")}
              >
                Back
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
