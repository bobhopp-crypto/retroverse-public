"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { InspectPayload } from "@/lib/inspect/types";

import "./inspect.css";

const QUICK_ARTISTS = [
  "Fleetwood Mac",
  "Eagles",
  "Madonna",
  "Elton John",
  "Bruce Springsteen",
];

function coverLabel(status: string): string {
  if (status === "ok") return "Cover OK";
  if (status === "path_only") return "Path only";
  return "Missing Cover";
}

export default function InspectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q")?.trim() ?? "";

  const [input, setInput] = useState(qParam);
  const [data, setData] = useState<InspectPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    if (q.length < 2) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inspect?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (res.status === 404) {
        setError("Inspector disabled (not in local development).");
        setData(null);
        return;
      }
      const body = (await res.json()) as InspectPayload & { error?: string };
      if (!res.ok || body.ok === false) {
        setError(body.error ?? `Request failed (${res.status})`);
        setData(null);
        return;
      }
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInput(qParam);
    if (qParam.length >= 2) void load(qParam);
    else {
      setData(null);
      setError(null);
    }
  }, [qParam, load]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    router.push(q.length >= 2 ? `/inspect?q=${encodeURIComponent(q)}` : "/inspect");
  }

  const resolved = data?.resolved;
  const showResults = data && qParam.length >= 2;

  return (
    <main className="inspect-page">
      <div className="inspect-page__inner">
        <p className="inspect-banner">Local dev — read-only graph inspector</p>

        <header className="inspect-header">
          <h1>Graph Inspector</h1>
          <p>See what local Postgres knows about an artist — no SQL required.</p>
        </header>

        <form className="inspect-form" onSubmit={onSubmit}>
          <label htmlFor="inspect-q">Artist name</label>
          <div className="inspect-form__row">
            <input
              id="inspect-q"
              name="q"
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Fleetwood Mac"
              autoComplete="off"
            />
            <button type="submit">Inspect</button>
          </div>
          <div className="inspect-chips" aria-label="Quick artists">
            {QUICK_ARTISTS.map((name) => (
              <Link key={name} href={`/inspect?q=${encodeURIComponent(name)}`}>
                {name}
              </Link>
            ))}
          </div>
        </form>

        {loading && <p className="inspect-loading">Reading local graph…</p>}
        {error && <p className="inspect-banner inspect-banner--warn">{error}</p>}

        {showResults && data.db.connected === false && (
          <p className="inspect-banner inspect-banner--warn">
            Database offline: {data.db.error ?? "cannot connect"}
          </p>
        )}

        {showResults && data.summary && (
          <div className="inspect-summary" aria-label="Summary">
            <div className="inspect-stat">
              <span className="inspect-stat__label">Albums Found</span>
              <span className="inspect-stat__value">{data.summary.albumsFound}</span>
            </div>
            <div className="inspect-stat">
              <span className="inspect-stat__label">Tracks Found</span>
              <span className="inspect-stat__value">{data.summary.tracksFound}</span>
            </div>
            <div className="inspect-stat">
              <span className="inspect-stat__label">Charted Tracks</span>
              <span className="inspect-stat__value">{data.summary.chartedTracks}</span>
            </div>
            <div className="inspect-stat">
              <span className="inspect-stat__label">In Library</span>
              <span className="inspect-stat__value">{data.summary.inLibraryTracks}</span>
            </div>
          </div>
        )}

        {showResults && resolved?.canonicalName && (
          <section className="inspect-section inspect-section--resolved" aria-labelledby="resolved-heading">
            <h2 id="resolved-heading">Resolved entity</h2>
            <p className="inspect-entity-name">{resolved.canonicalName}</p>
            <p className="inspect-meta">
              Canonical Artist · PG id {resolved.artistId ?? "—"} · {resolved.matchType ?? "—"} match
              {resolved.kind === "ambiguous" ? " · multiple candidates" : ""}
            </p>
            {resolved.candidates && resolved.candidates.length > 1 && (
              <ul className="inspect-notes">
                {resolved.candidates.map((c) => (
                  <li key={c.id}>
                    {c.name} (id {c.id})
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {showResults && resolved?.kind === "none" && (
          <section className="inspect-section inspect-section--resolved">
            <h2>Resolved entity</h2>
            <p className="inspect-meta">No local artist row for “{data.q}”.</p>
          </section>
        )}

        {showResults && data.albums.length > 0 && (
          <section className="inspect-section" aria-labelledby="albums-heading">
            <h2 id="albums-heading">Linked albums</h2>
            <ul className="inspect-list">
              {data.albums.map((a) => (
                <li key={a.pgAlbumId} className="inspect-card">
                  <p className="inspect-card__title">
                    {a.title}
                    {a.releaseYear != null ? ` (${a.releaseYear})` : ""}
                  </p>
                  <p className="inspect-card__sub">
                    {a.rval ?? "Missing Link (no RVAL)"} · {a.sequenceTracks} sequence rows
                    {a.b200Peak != null ? ` · B200 peak #${a.b200Peak}` : ""}
                  </p>
                  <div className="inspect-badges">
                    <span
                      className={`inspect-badge ${a.rval ? "inspect-badge--ok" : "inspect-badge--warn"}`}
                    >
                      {a.rval ? "RVAL bridged" : "Missing Link"}
                    </span>
                    <span
                      className={`inspect-badge ${a.coverStatus === "missing" ? "inspect-badge--warn" : "inspect-badge--ok"}`}
                    >
                      {coverLabel(a.coverStatus)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showResults && data.tracks.length > 0 && (
          <section className="inspect-section inspect-section--tracks" aria-labelledby="tracks-heading">
            <h2 id="tracks-heading">Linked tracks</h2>
            <ul className="inspect-list">
              {data.tracks.map((t) => (
                <li key={t.rvtr} className="inspect-card">
                  <p className="inspect-card__title">{t.title}</p>
                  <p className="inspect-card__sub">
                    {t.rvtr}
                    {t.peakHot100 != null ? ` · Peak #${t.peakHot100}` : ""}
                    {t.chartWeeks > 0 ? ` · ${t.chartWeeks} wks` : ""}
                  </p>
                  <div className="inspect-badges">
                    {t.charted && <span className="inspect-badge inspect-badge--ok">Charted</span>}
                    {t.inLibrary && <span className="inspect-badge inspect-badge--ok">In Library</span>}
                    {!t.inLibrary && <span className="inspect-badge inspect-badge--muted">Not in VDJ graph</span>}
                    {t.hasVideo && <span className="inspect-badge inspect-badge--ok">Video</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showResults && data.chartAppearances.length > 0 && (
          <section className="inspect-section inspect-section--charts" aria-labelledby="charts-heading">
            <h2 id="charts-heading">Chart appearances</h2>
            <ul className="inspect-list">
              {data.chartAppearances.map((c, i) => (
                <li key={`${c.chartDate}-${c.position}-${i}`} className="inspect-card">
                  <p className="inspect-card__title">{c.trackTitle}</p>
                  <p className="inspect-card__sub">
                    {c.chartName} · {c.chartDate} · #{c.position}
                    {c.weeksOnChart != null ? ` · ${c.weeksOnChart} wks` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showResults && data.debugNotes.length > 0 && (
          <section className="inspect-section" aria-labelledby="notes-heading">
            <h2 id="notes-heading">Debug notes</h2>
            <ul className="inspect-notes">
              {data.debugNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
            {data.homeSearchCompare && (
              <p className="inspect-meta" style={{ marginTop: "0.75rem" }}>
                Public search compare: {data.homeSearchCompare.trackCount} tracks,{" "}
                {data.homeSearchCompare.albumCount} albums
                {data.homeSearchCompare.artistNames.length
                  ? ` · artists: ${data.homeSearchCompare.artistNames.join(", ")}`
                  : ""}
                {data.homeSearchCompare.incomplete ? " · incomplete upstream" : ""}
              </p>
            )}
          </section>
        )}

        {showResults && (
          <details className="inspect-section inspect-debug">
            <summary>Raw JSON (debug)</summary>
            <pre className="inspect-debug__body">{JSON.stringify(data, null, 2)}</pre>
          </details>
        )}

        <p className="inspect-footer">
          <Link href="/">← Home</Link>
          {" · "}
          <Link href="/search">Search</Link>
        </p>
      </div>
    </main>
  );
}
