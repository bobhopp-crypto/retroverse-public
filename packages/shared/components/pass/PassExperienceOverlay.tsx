"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { PassScanResult, RetroverseVisitor } from "@/lib/retroverse-pass/types";

import "./pass-experience-overlay.css";

/**
 * Pass Experience overlay — sits on top of the live broadcast.
 *
 * First scan: registration form (first name required, contact optional).
 * Returning: told the pass is already registered, with an Edit option.
 * Dismissing always returns straight to the broadcast underneath —
 * the visitor never leaves Retroverse Live.
 */

type View = "claim" | "confirmed" | "already" | "edit" | "mypass" | "closed";

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
  const [view, setView] = useState<View>(scan.state === "claimed" ? "already" : "claim");
  const [visitor, setVisitor] = useState<RetroverseVisitor | null>(
    scan.state === "claimed" ? scan.visitor : null,
  );

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
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

  function openEdit() {
    setError(null);
    setFirstName(visitor?.firstName ?? "");
    setEmail(visitor?.email ?? "");
    setPhone(visitor?.phone ?? "");
    setView("edit");
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pass/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial, firstName, lastName, email, phone, birthday, postalCode, marketingOptIn }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        visitor?: RetroverseVisitor;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.visitor) {
        throw new Error(data.error ?? "Registration failed. Please try again.");
      }
      setVisitor(data.visitor);
      setView("confirmed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pass/claim", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial, firstName, lastName, email, phone, birthday, postalCode, marketingOptIn }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        visitor?: RetroverseVisitor;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.visitor) {
        throw new Error(data.error ?? "Update failed. Please try again.");
      }
      setVisitor(data.visitor);
      setView("already");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed. Please try again.");
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
            <header className="pass-xp__header">
              <p className="pass-xp__kicker">Retroverse Pass</p>
              <h1 className="pass-xp__title">Welcome to Retroverse</h1>
              <p className="pass-xp__serial">
                <span>Pass</span>
                <strong>{serial}</strong>
              </p>
              <p className="pass-xp__intro">
                Register your pass to unlock Retroverse experiences, rewards, and live events.
              </p>
            </header>

            <form className="pass-xp__form pass-xp__form--claim" onSubmit={(e) => void handleClaim(e)}>
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
              <label><span>Last Name (optional)</span><input type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
              <label>
                <span>Email (optional)</span>
                <input
                  type="email"
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
              <label><span>Birthday (optional)</span><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></label>
              <label><span>Postal Code (optional)</span><input type="text" autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></label>
              <label className="pass-xp__check"><input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} /><span>Send me Retroverse updates</span></label>

              {error ? <p className="pass-xp__error">{error}</p> : null}

              <button
                type="submit"
                className="pass-xp__primary"
                disabled={busy || !firstName.trim()}
              >
                {busy ? "Registering…" : "Register My Pass"}
              </button>
            </form>

            <button type="button" className="pass-xp__skip" onClick={dismiss}>
              Not now — take me to the show
            </button>
          </>
        ) : null}

        {view === "confirmed" ? (
          <div className="pass-xp__confirmed">
            <div className="pass-xp__success-mark" aria-hidden="true">✓</div>
            <p className="pass-xp__kicker">Pass {serial} registered</p>
            <h1 className="pass-xp__title">
              You&apos;re in{visitor ? `, ${visitor.firstName}` : ""}.
            </h1>
            <p className="pass-xp__success-copy">Your Retroverse Pass is officially registered.</p>
            <p className="pass-xp__note">Returning you to the show…</p>
          </div>
        ) : null}

        {view === "already" ? (
          <>
            <header className="pass-xp__header">
              <p className="pass-xp__kicker">Retroverse Pass</p>
              <h1 className="pass-xp__title">
                Hi{visitor ? `, ${visitor.firstName}` : ""}, this pass is already registered.
              </h1>
              <p className="pass-xp__serial">
                <span>Pass</span>
                <strong>{serial}</strong>
              </p>
            </header>

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
                <button type="button" className="pass-xp__secondary" onClick={openEdit}>
                  Edit
                </button>
                <button type="button" className="pass-xp__secondary" onClick={handleSearch}>
                  Search
                </button>
              </div>
              <button type="button" className="pass-xp__skip" onClick={() => setView("mypass")}>
                View my pass
              </button>
            </div>
          </>
        ) : null}

        {view === "edit" ? (
          <>
            <header className="pass-xp__header">
              <p className="pass-xp__kicker">Edit Registration</p>
              <h1 className="pass-xp__title">Update your info</h1>
              <p className="pass-xp__serial">
                <span>Pass</span>
                <strong>{serial}</strong>
              </p>
            </header>

            <form className="pass-xp__form" onSubmit={(e) => void handleUpdate(e)}>
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
              <label><span>Last Name (optional)</span><input type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
              <label>
                <span>Email (optional)</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label><span>Birthday (optional)</span><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></label>
              <label><span>Postal Code (optional)</span><input type="text" autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></label>
              <label className="pass-xp__check"><input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} /><span>Send me Retroverse updates</span></label>
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
                disabled={busy || !firstName.trim()}
              >
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </form>

            <button type="button" className="pass-xp__skip" onClick={() => setView("already")}>
              Cancel
            </button>
          </>
        ) : null}

        {view === "mypass" ? (
          <>
            <header className="pass-xp__header">
              <p className="pass-xp__kicker">My Pass</p>
              <h1 className="pass-xp__title">Pass {serial}</h1>
            </header>

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
              <button type="button" className="pass-xp__secondary" onClick={openEdit}>
                Edit
              </button>
              <button
                type="button"
                className="pass-xp__skip"
                onClick={() => setView("already")}
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
