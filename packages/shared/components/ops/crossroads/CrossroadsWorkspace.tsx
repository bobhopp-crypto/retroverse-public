"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { CrossroadsArtist, CrossroadsPayload } from "@/lib/ops/crossroads/types";

const DEFAULT_YEARS: [number, number, number] = [1967, 1978, 1992];

function parseYearInput(value: string): number | null {
  const y = Number(value);
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

/** Header scan line: 1967 (3) · 1978 (12) · 1992 (1) */
function formatYearCountsHeader(artist: CrossroadsArtist, years: number[]): string {
  return years
    .map((y) => {
      const n = artist.yearCounts[y] ?? 0;
      return n > 0 ? `${y} (${n})` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

export function CrossroadsWorkspace() {
  const [yearA, setYearA] = useState(String(DEFAULT_YEARS[0]));
  const [yearB, setYearB] = useState(String(DEFAULT_YEARS[1]));
  const [yearC, setYearC] = useState(String(DEFAULT_YEARS[2]));
  const [data, setData] = useState<CrossroadsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Artists manually collapsed; default is all expanded. */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const parsed = useMemo(() => {
    const a = parseYearInput(yearA);
    const b = parseYearInput(yearB);
    const c = parseYearInput(yearC);
    const distinct = new Set([a, b, c].filter((y): y is number => y != null));
    return { a, b, c, distinctCount: distinct.size, valid: a != null && b != null && c != null };
  }, [yearA, yearB, yearC]);

  const load = useCallback(async () => {
    if (!parsed.valid || parsed.distinctCount < 2) {
      setLoading(false);
      setData(null);
      setError(
        parsed.distinctCount < 2
          ? "Choose at least two different years"
          : "Enter valid years (1900–2099)",
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        yearA: String(parsed.a),
        yearB: String(parsed.b),
        yearC: String(parsed.c),
      });
      const res = await fetch(`/api/ops/crossroads?${qs}`);
      const json = (await res.json()) as CrossroadsPayload & { error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Load failed (${res.status})`);
        setData(null);
        return;
      }
      setData(json);
      setCollapsed(new Set());
    } catch {
      setError("Failed to load crossroads");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [parsed]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleCollapsed(artistNorm: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(artistNorm)) next.delete(artistNorm);
      else next.add(artistNorm);
      return next;
    });
  }

  const tripleCount = data?.artists.filter((a) => a.inAllYears).length ?? 0;

  return (
    <div className="ops-crossroads">
      <form
        className="ops-crossroads__controls"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="ops-crossroads__field">
          <span>Year A</span>
          <input
            type="number"
            min={1900}
            max={2099}
            value={yearA}
            onChange={(e) => setYearA(e.target.value)}
          />
        </label>
        <label className="ops-crossroads__field">
          <span>Year B</span>
          <input
            type="number"
            min={1900}
            max={2099}
            value={yearB}
            onChange={(e) => setYearB(e.target.value)}
          />
        </label>
        <label className="ops-crossroads__field">
          <span>Year C</span>
          <input
            type="number"
            min={1900}
            max={2099}
            value={yearC}
            onChange={(e) => setYearC(e.target.value)}
          />
        </label>
        <button type="submit" className="ops-crossroads__submit" disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </form>

      {error ? <p className="ops-empty">{error}</p> : null}

      {data && !error ? (
        <>
          <p className="ops-crossroads__summary">
            <strong>{data.artistCount}</strong> bridge artists across{" "}
            <strong>{data.distinctYears.join(" · ")}</strong>
            {data.distinctYears.length === 3 ? (
              <>
                {" "}
                · <strong>{tripleCount}</strong> in all three years
              </>
            ) : null}
          </p>

          <ul className="ops-crossroads__list">
            {data.artists.map((artist) => {
              const open = !collapsed.has(artist.artistNorm);
              const years = data.distinctYears;
              const headerCounts = formatYearCountsHeader(artist, years);

              return (
                <li
                  key={artist.artistNorm}
                  className={`ops-crossroads__card${artist.inAllYears ? " ops-crossroads__card--triple" : ""}${open ? "" : " ops-crossroads__card--collapsed"}`}
                >
                  <button
                    type="button"
                    className="ops-crossroads__card-head"
                    onClick={() => toggleCollapsed(artist.artistNorm)}
                    aria-expanded={open}
                  >
                    <span className="ops-crossroads__artist">{artist.artist}</span>
                    {artist.inAllYears ? (
                      <span className="ops-crossroads__badge">All years</span>
                    ) : artist.spanCount === 2 ? (
                      <span className="ops-crossroads__badge ops-crossroads__badge--pair">
                        2 years
                      </span>
                    ) : null}
                    <span className="ops-crossroads__counts">{headerCounts}</span>
                    <span className="ops-crossroads__chevron" aria-hidden>
                      {open ? "▾" : "▸"}
                    </span>
                  </button>

                  {open ? (
                    <div className="ops-crossroads__songs">
                      {years.map((y, yearIndex) => {
                        const list = artist.songsByYear[y] ?? [];
                        if (list.length === 0) return null;
                        return (
                          <section
                            key={y}
                            className={`ops-crossroads__year-block ops-crossroads__year-block--${yearIndex % 3}`}
                          >
                            <h3 className="ops-crossroads__year-label">{y}</h3>
                            <ul>
                              {list.map((title) => (
                                <li key={`${y}-${title}`}>{title}</li>
                              ))}
                            </ul>
                          </section>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {data.artists.length === 0 ? (
            <p className="ops-empty">No artists appear in at least two of these years.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
