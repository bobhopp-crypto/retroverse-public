"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  PublicJukeboxRelayCatalog,
  PublicJukeboxRelayReceipt,
  PublicJukeboxRelayStatus,
  PublicJukeboxRelayTrack,
} from "@/lib/song-requests/jukebox-relay-types";

import "./public-song-request-experience.css";

type Screen = "search" | "detail" | "confirmation";
type GuestIdentity = { sessionToken: string; guestId: string };

const IDENTITY_KEY = "retroverse:live-request-guest";
const NICKNAME_KEY = "retroverse:live-request-nickname";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

function freshId(): string {
  return window.crypto.randomUUID();
}

function loadGuestIdentity(sessionToken: string): GuestIdentity {
  try {
    const saved = JSON.parse(window.localStorage.getItem(IDENTITY_KEY) ?? "null") as Partial<GuestIdentity> | null;
    if (saved?.sessionToken === sessionToken && typeof saved.guestId === "string") {
      return { sessionToken, guestId: saved.guestId };
    }
  } catch {
    // A malformed browser value is replaced with a clean event-scoped identity.
  }
  const identity = { sessionToken, guestId: freshId() };
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

function RequestArtwork({ track }: { track: PublicJukeboxRelayTrack }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="live-request__art" data-fallback={failed || !track.heroUrl ? "true" : "false"}>
      {track.heroUrl && !failed ? (
        <img src={track.heroUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : null}
      <span aria-hidden="true">▶</span>
    </span>
  );
}

export function PublicSongRequestExperience() {
  const [status, setStatus] = useState<PublicJukeboxRelayStatus>({ isOpen: false, sessionToken: null });
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("search");
  const [identity, setIdentity] = useState<GuestIdentity | null>(null);
  const [nickname, setNickname] = useState("");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<PublicJukeboxRelayCatalog | null>(null);
  const [selected, setSelected] = useState<PublicJukeboxRelayTrack | null>(null);
  const [receipt, setReceipt] = useState<PublicJukeboxRelayReceipt | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await readJson<PublicJukeboxRelayStatus>(
        await fetch("/api/jukebox-relay/status", { cache: "no-store" }),
      );
      setStatus((current) => {
        if (current.sessionToken && next.sessionToken !== current.sessionToken) {
          setOpen(false);
          setScreen("search");
          setCatalog(null);
          setSelected(null);
          setReceipt(null);
          setPendingRequestId(null);
        }
        return next;
      });
    } catch {
      setStatus((current) => ({ isOpen: false, sessionToken: current.sessionToken }));
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(() => void refreshStatus(), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  useEffect(() => {
    if (!status.isOpen || !status.sessionToken) return;
    setIdentity(loadGuestIdentity(status.sessionToken));
    setNickname(window.localStorage.getItem(NICKNAME_KEY) ?? "");
  }, [status.isOpen, status.sessionToken]);

  const loadCatalog = useCallback(async (needle: string, sessionToken: string) => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ session: sessionToken, limit: "60" });
      if (needle.trim()) params.set("q", needle.trim());
      const next = await readJson<PublicJukeboxRelayCatalog>(
        await fetch(`/api/jukebox-relay/catalog?${params.toString()}`, { cache: "no-store" }),
      );
      setCatalog(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The song list is unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!open || screen !== "search" || !status.sessionToken) return;
    const timer = window.setTimeout(() => void loadCatalog(query, status.sessionToken!), query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog, open, query, screen, status.sessionToken]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function chooseTrack(track: PublicJukeboxRelayTrack) {
    setSelected(track);
    setPendingRequestId(freshId());
    setError(null);
    setScreen("detail");
  }

  async function requestTrack() {
    if (!identity || !selected || !status.sessionToken) return;
    const requestId = pendingRequestId ?? freshId();
    setPendingRequestId(requestId);
    setBusy(true);
    setError(null);
    try {
      window.localStorage.setItem(NICKNAME_KEY, nickname.trim());
      const payload = await readJson<{ ok: true; receipt: PublicJukeboxRelayReceipt }>(
        await fetch("/api/jukebox-relay/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicRequestId: requestId,
            sessionToken: status.sessionToken,
            guestId: identity.guestId,
            nickname,
            trackKey: selected.key,
          }),
        }),
      );
      setReceipt(payload.receipt);
      setScreen("confirmation");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const policy = useMemo(() => {
    if (!catalog) return null;
    return catalog.requestLimit == null ? "Unlimited requests" : `${catalog.requestLimit} per guest`;
  }, [catalog]);

  if (!status.isOpen || !status.sessionToken) {
    return open ? (
      <div className="live-request__backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
        <section className="live-request__sheet live-request__sheet--closed" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <p>RETROVERSE LIVE</p>
          <h2>Song requests are closed.</h2>
          <button type="button" className="live-request__primary" onClick={() => setOpen(false)}>BACK TO LIVE</button>
        </section>
      </div>
    ) : null;
  }

  return (
    <>
      <button type="button" className="live-request__badge" onClick={() => setOpen(true)}>
        <span aria-hidden="true">♫</span> REQUEST A SONG
      </button>

      {open ? (
        <div className="live-request__backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="live-request__sheet" role="dialog" aria-modal="true" aria-label="Request a song" onMouseDown={(event) => event.stopPropagation()}>
            <header className="live-request__header">
              <div>
                <p>RETROVERSE LIVE</p>
                <h2>{screen === "confirmation" ? "REQUESTED ✓" : "REQUEST A SONG"}</h2>
              </div>
              <button type="button" className="live-request__close" aria-label="Back to Live" onClick={() => setOpen(false)}>×</button>
            </header>

            {screen === "search" ? (
              <div className="live-request__search-screen">
                <label className="live-request__nickname">
                  <span>NAME OR NICKNAME <em>OPTIONAL</em></span>
                  <input maxLength={32} value={nickname} autoComplete="off" onChange={(event) => setNickname(event.target.value)} placeholder="Guest" />
                </label>
                <label className="live-request__search">
                  <span>SEARCH ARTIST OR TITLE</span>
                  <input type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Prince, Heart of Glass…" />
                </label>
                <div className="live-request__meta">
                  <span>{busy ? "SEARCHING…" : `${catalog?.total.toLocaleString() ?? 0} VIDEOS`}</span>
                  {policy ? <span>{policy}</span> : null}
                </div>
                <div className="live-request__results" role="list">
                  {catalog?.tracks.map((track) => (
                    <button type="button" role="listitem" className="live-request__result" key={track.key} onClick={() => chooseTrack(track)}>
                      <RequestArtwork track={track} />
                      <span className="live-request__result-copy">
                        <strong>{track.title}</strong>
                        <span>{track.artist}{track.year ? ` · ${track.year}` : ""}</span>
                      </span>
                      <span className="live-request__chevron" aria-hidden="true">›</span>
                    </button>
                  ))}
                  {!busy && catalog && catalog.tracks.length === 0 ? <p className="live-request__empty">No videos match that search.</p> : null}
                </div>
                {error ? <p className="live-request__error" role="alert">{error}</p> : null}
              </div>
            ) : null}

            {screen === "detail" && selected ? (
              <div className="live-request__detail">
                <button type="button" className="live-request__back" onClick={() => setScreen("search")}>← BACK TO SEARCH</button>
                <RequestArtwork track={selected} />
                <p>YOU PICKED</p>
                <h3>{selected.title}</h3>
                <h4>{selected.artist}</h4>
                {selected.year ? <span>{selected.year}</span> : null}
                <button type="button" className="live-request__primary" disabled={busy} onClick={() => void requestTrack()}>
                  {busy ? "SENDING…" : "REQUEST"}
                </button>
                {error ? <p className="live-request__error" role="alert">{error}</p> : null}
              </div>
            ) : null}

            {screen === "confirmation" && receipt ? (
              <div className="live-request__confirmation">
                <div className="live-request__check" aria-hidden="true">✓</div>
                <p>{receipt.duplicate ? "ALREADY REQUESTED" : "REQUESTED ✓"}</p>
                <h3>{receipt.title}</h3>
                <h4>{receipt.artist}</h4>
                <div className="live-request__confirmation-actions">
                  <button type="button" className="live-request__primary" onClick={() => {
                    setSelected(null);
                    setReceipt(null);
                    setPendingRequestId(null);
                    setScreen("search");
                  }}>REQUEST ANOTHER</button>
                  <button type="button" className="live-request__secondary" onClick={() => setOpen(false)}>BACK TO LIVE</button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
