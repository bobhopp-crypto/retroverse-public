"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { JukeboxOperatorStatus } from "@/lib/song-requests/jukebox-types";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "online" | "offline" | "error";
}) {
  return (
    <li>
      <span className={`juke-ops__lamp juke-ops__lamp--${tone}`} aria-hidden="true" />
      <strong>{label}</strong>
      <span>{value}</span>
    </li>
  );
}

function formatStarted(value: string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function JukeboxOperatorPanel({ initialStatus }: { initialStatus: JukeboxOperatorStatus | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customLimit, setCustomLimit] = useState("6");

  const refresh = useCallback(async () => {
    try {
      setStatus(await readJson<JukeboxOperatorStatus>(await fetch("/api/ops/jukebox", { cache: "no-store" })));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status is unavailable.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function sessionAction(action: "start-session" | "end-session" | "requests-on" | "requests-off") {
    setBusy(true);
    setError(null);
    try {
      setStatus(await readJson<JukeboxOperatorStatus>(await fetch("/api/ops/jukebox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The jukebox session could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function policy(requestsPerGuest: number | null) {
    setBusy(true);
    setError(null);
    try {
      setStatus(await readJson<JukeboxOperatorStatus>(await fetch("/api/ops/jukebox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestsPerGuest }),
      })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The policy could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const active = status?.activeSession ?? null;
  const bridgeOnline = Boolean(status?.bridge.running && status.bridge.enabled && status.bridge.localEndpoint);
  const localReady = Boolean(active && status?.guestUiOnline && status.requestApiOnline);
  const requestsEnabled = status?.requestsEnabled === true;
  const relayTone = status?.publicRelay.status === "error" ? "error" : requestsEnabled && status?.publicRelay.status === "open" ? "online" : "offline";
  const relayLabel = status?.publicRelay.status === "error" ? "RELAY ERROR" : requestsEnabled && status?.publicRelay.status === "open" ? "OPEN" : "CLOSED";
  const limit = status?.requestsPerGuest ?? null;

  return (
    <main className="juke-ops">
      <header className="juke-ops__header">
        <div>
          <p>RV01-23 · COCKPIT</p>
          <h1>Video Jukebox</h1>
          <span>Guest video requests · Bob keeps playback control</span>
        </div>
        <Link href="/bobos">← Cockpit</Link>
      </header>

      <section className={`juke-ops__hero juke-ops__hero--${status?.ready ? "ready" : "offline"}`}>
        <div>
          <p>JUKEBOX</p>
          <h2>{active ? requestsEnabled ? "SONG REQUESTS ON" : "SESSION READY · REQUESTS OFF" : "NO ACTIVE SESSION"}</h2>
          <span>{active?.name ?? "Start a clean live queue for tonight."}</span>
        </div>
        {active ? (
          <a href="/jukebox" target="_blank" rel="noreferrer">OPEN JUKEBOX</a>
        ) : (
          <button type="button" disabled={busy} onClick={() => void sessionAction("start-session")}>
            {busy ? "STARTING…" : "START NEW SESSION"}
          </button>
        )}
      </section>

      {error ? <p className="juke-ops__error" role="alert">{error}</p> : null}

      <div className="juke-ops__grid">
        <section className="juke-ops__card juke-ops__url">
          <p className="juke-ops__eyebrow">IPAD URL</p>
          <a href={status?.ipadUrl ?? "http://Bobs-MacBook-Pro.local:3000/jukebox"}>{status?.ipadUrl ?? "http://Bobs-MacBook-Pro.local:3000/jukebox"}</a>
          <span>Bookmark this one guest-only address on the iPad.</span>
        </section>

        <section className="juke-ops__card">
          <p className="juke-ops__eyebrow">MASTER CONTROL</p>
          <h3>SONG REQUESTS</h3>
          <div className="juke-ops__request-switch" role="group" aria-label="Song requests on or off">
            <button
              type="button"
              aria-pressed={!requestsEnabled}
              disabled={busy || !active}
              onClick={() => void sessionAction("requests-off")}
            >OFF</button>
            <button
              type="button"
              aria-pressed={requestsEnabled}
              disabled={busy || !active}
              onClick={() => void sessionAction("requests-on")}
            >ON</button>
          </div>
          <span className="juke-ops__request-note">
            {requestsEnabled
              ? "Local iPad and Retroverse Live are accepting requests."
              : "No new local or public requests. The VirtualDJ list stays intact."}
          </span>
          {status?.publicRelay.lastError ? <p className="juke-ops__relay-error">{status.publicRelay.lastError}</p> : null}
        </section>

        <section className="juke-ops__card">
          <p className="juke-ops__eyebrow">SERVICE STATUS</p>
          <ul className="juke-ops__services">
            <StatusRow label="LOCAL JUKEBOX" value={localReady ? "READY" : "OFFLINE"} tone={localReady ? "online" : "offline"} />
            <StatusRow label="PUBLIC REQUESTS" value={relayLabel} tone={relayTone} />
            <StatusRow label="LOCAL REQUEST STORE" value={status?.storage?.authority === "local" ? "READY" : "OFFLINE"} tone={status?.storage?.authority === "local" ? "online" : "offline"} />
            <StatusRow label="VIRTUALDJ — JUKEBOX REQUESTS" value={bridgeOnline ? "READY" : "OFFLINE"} tone={bridgeOnline ? "online" : "offline"} />
          </ul>
        </section>

        <section className="juke-ops__card">
          <p className="juke-ops__eyebrow">EVENT / SESSION</p>
          <div className="juke-ops__session">
            <strong>{active?.name ?? "NO ACTIVE SESSION"}</strong>
            <span>Started: {formatStarted(active?.startedAt)}</span>
            {active ? <code>{active.sessionId}</code> : null}
          </div>
          <dl className="juke-ops__metrics">
            <div><dt>VIDEOS</dt><dd>{status?.catalogCount.toLocaleString() ?? "—"}</dd></div>
            <div><dt>GUESTS</dt><dd>{status?.activeGuestCount ?? "—"}</dd></div>
            <div><dt>REQUESTS</dt><dd>{status?.requestCount ?? "—"}</dd></div>
          </dl>
        </section>

        <section className="juke-ops__card">
          <p className="juke-ops__eyebrow">POLICY</p>
          <h3>REQUESTS PER GUEST</h3>
          <div className="juke-ops__limits" role="group" aria-label="Requests per guest">
            {[null, 1, 2, 3, 5].map((value) => (
              <button
                type="button"
                key={value ?? "unlimited"}
                aria-pressed={limit === value}
                disabled={busy || !active}
                onClick={() => void policy(value)}
              >
                {value ?? "UNLIMITED"}
              </button>
            ))}
          </div>
          <div className="juke-ops__custom">
            <input aria-label="Custom request limit" type="number" min="1" max="99" value={customLimit} onChange={(event) => setCustomLimit(event.target.value)} />
            <button type="button" disabled={busy || !active} onClick={() => void policy(Number(customLimit))}>SET CUSTOM</button>
          </div>
          {active ? (
            <button
              className="juke-ops__toggle"
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("End this jukebox session? Its requests will remain preserved.")) {
                  void sessionAction("end-session");
                }
              }}
            >
              END SESSION
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}
