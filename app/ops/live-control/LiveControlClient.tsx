"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { LiveControlConfig, LiveControlState } from "@/lib/live-control/types";
import { PRODUCER_ERA_IDS, eraDisplayLabel } from "@/lib/ops/year-workspace/producer/era";

type StatusResponse = {
  control: LiveControlState;
  currentRvtr: string | null;
  currentTitle: string | null;
  currentArtist: string | null;
  live: { updatedAt: string };
  error?: string;
};

const YEAR_OPTIONS = Array.from({ length: 35 }, (_, index) => 1960 + index);
const PLAYLIST_YEARS = [1967, 1978, 1992];

const MODE_LABELS = {
  vdj: "VirtualDJ Mode",
  demo: "Demo Mode",
  playlist: "Playlist Mode",
} as const;

const SOURCE_LABELS = {
  all_packages: "All Packages",
  sunday_nights: "Sunday Nights",
  year: "Year",
  era: "Era",
  artist: "Artist",
  top_played: "Top Played",
} as const;

async function patchLiveControl(body: Record<string, unknown>): Promise<StatusResponse> {
  const res = await fetch("/api/ops/live-control", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as StatusResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function LiveControlClient({ initial }: { initial: StatusResponse }) {
  const [status, setStatus] = useState(initial);
  const [config, setConfig] = useState<LiveControlConfig>(initial.control);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artists, setArtists] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/ops/live-control", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as StatusResponse;
    setStatus(data);
    setConfig(data.control);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 2500);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    async function loadArtists() {
      try {
        const res = await fetch("/api/ops/browser-plus?mode=retroverse", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { rows?: Array<{ artist?: string }> };
        const names = [...new Set((data.rows ?? []).map((row) => row.artist?.trim()).filter(Boolean) as string[])].sort();
        if (!cancelled) setArtists(names.slice(0, 200));
      } catch {
        /* optional artist list */
      }
    }
    void loadArtists();
    return () => {
      cancelled = true;
    };
  }, []);

  const running = status.control.running;
  const modeLabel = MODE_LABELS[status.control.mode];

  const sourceFields = useMemo(() => {
    if (config.contentSource === "year") {
      return (
        <label>
          Year
          <select
            value={config.year ?? 1971}
            onChange={(event) => setConfig((current) => ({ ...current, year: Number(event.currentTarget.value) }))}
          >
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      );
    }
    if (config.contentSource === "era") {
      return (
        <label>
          RVBR Era
          <select
            value={config.era ?? "1978"}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                era: event.currentTarget.value as LiveControlConfig["era"],
              }))
            }
          >
            {PRODUCER_ERA_IDS.map((era) => (
              <option key={era} value={era}>{eraDisplayLabel(era)}</option>
            ))}
          </select>
        </label>
      );
    }
    if (config.contentSource === "artist") {
      return (
        <label>
          Artist
          <input
            type="search"
            list="live-control-artists"
            value={config.artist ?? ""}
            onChange={(event) => setConfig((current) => ({ ...current, artist: event.currentTarget.value }))}
            placeholder="Don McLean"
          />
          <datalist id="live-control-artists">
            {artists.map((artist) => (
              <option key={artist} value={artist} />
            ))}
          </datalist>
        </label>
      );
    }
    if (config.contentSource === "sunday_nights" || config.mode === "playlist") {
      return (
        <label>
          Playlist Year
          <select
            value={config.playlistYear ?? 1967}
            onChange={(event) =>
              setConfig((current) => ({ ...current, playlistYear: Number(event.currentTarget.value) }))
            }
          >
            {PLAYLIST_YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      );
    }
    return null;
  }, [artists, config]);

  async function saveConfig() {
    setBusy(true);
    setError(null);
    try {
      const data = await patchLiveControl({ op: "updateConfig", config });
      setStatus(data);
      setConfig(data.control);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Config save failed");
    } finally {
      setBusy(false);
    }
  }

  async function startLive() {
    setBusy(true);
    setError(null);
    try {
      const data = await patchLiveControl({ op: "start", config });
      setStatus(data);
      setConfig(data.control);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start failed");
    } finally {
      setBusy(false);
    }
  }

  async function stopLive() {
    setBusy(true);
    setError(null);
    try {
      const data = await patchLiveControl({ op: "stop" });
      setStatus(data);
      setConfig(data.control);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setBusy(false);
    }
  }

  async function nextSong() {
    setBusy(true);
    setError(null);
    try {
      const data = await patchLiveControl({ op: "next" });
      setStatus(data);
      setConfig(data.control);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Next failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-live-control">
      <section className="ops-live-control__hero">
        <p className="ops-command__kicker">Retroverse Live Control Center</p>
        <h1>Command The Channel</h1>
        <p>Run Demo or Playlist rotation unattended. VirtualDJ Mode follows the bridge.</p>
      </section>

      <div className="ops-live-control__grid">
        <section className="ops-live-control__panel ops-live-control__panel--wide">
          <h2>Live Status</h2>
          <div className="ops-live-control__status-grid">
            <p><span>Status</span><strong className={running ? "running" : "stopped"}>{running ? "Running" : "Stopped"}</strong></p>
            <p><span>Mode</span><strong>{modeLabel}</strong></p>
            <p><span>Current RVTR</span><strong>{status.currentRvtr ?? "—"}</strong></p>
            <p><span>Current Song</span><strong>{status.currentTitle ? `${status.currentTitle} · ${status.currentArtist ?? ""}` : "—"}</strong></p>
            <p><span>Last Change</span><strong>{formatTimestamp(status.control.lastChangeAt)}</strong></p>
            <p><span>Queue Size</span><strong>{status.control.queueRvtrs.length}</strong></p>
          </div>
          <div className="ops-live-control__controls">
            <button type="button" className="primary" disabled={busy || running} onClick={startLive}>
              Start Live
            </button>
            <button type="button" className="danger" disabled={busy || !running} onClick={stopLive}>
              Stop Live
            </button>
            <button type="button" disabled={busy || !running || config.mode === "vdj"} onClick={nextSong}>
              Next Song
            </button>
          </div>
          <div className="ops-live-control__links">
            <Link href="/live" target="_blank" rel="noreferrer">Open /live</Link>
            <Link href="/retroverse-2/live" target="_blank" rel="noreferrer">Open RV2 Live</Link>
            <Link href="/ops/live">Bridge Health</Link>
          </div>
          {error ? <div className="ops-live-control__error" role="alert">{error}</div> : null}
        </section>

        <section className="ops-live-control__panel">
          <h2>Mode</h2>
          <div className="ops-live-control__mode-tabs">
            {(Object.keys(MODE_LABELS) as Array<keyof typeof MODE_LABELS>).map((mode) => (
              <button
                key={mode}
                type="button"
                className={config.mode === mode ? "active" : ""}
                disabled={running}
                onClick={() => setConfig((current) => ({ ...current, mode }))}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </section>

        <section className="ops-live-control__panel">
          <h2>Timing</h2>
          <div className="ops-live-control__field-grid">
            <label>
              Rotation Duration
              <select
                value={config.durationSeconds}
                disabled={config.mode === "vdj"}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    durationSeconds: Number(event.currentTarget.value) as LiveControlConfig["durationSeconds"],
                  }))
                }
              >
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={120}>120 seconds</option>
              </select>
            </label>
            <label>
              Ordering
              <select
                value={config.order}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    order: event.currentTarget.value as LiveControlConfig["order"],
                  }))
                }
              >
                <option value="random">Random</option>
                <option value="most_played">Most Played</option>
                <option value="chronological">Chronological</option>
                <option value="playlist_order">Playlist Order</option>
              </select>
            </label>
          </div>
        </section>

        <section className="ops-live-control__panel">
          <h2>Source Filters</h2>
          <div className="ops-live-control__field-grid">
            <label>
              Content Source
              <select
                value={config.contentSource}
                disabled={config.mode === "playlist"}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    contentSource: event.currentTarget.value as LiveControlConfig["contentSource"],
                  }))
                }
              >
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {sourceFields}
          </div>
        </section>

        <section className="ops-live-control__panel">
          <h2>Package Quality</h2>
          <div className="ops-live-control__checks">
            <label>
              <input
                type="checkbox"
                checked={config.readyOnly}
                onChange={(event) => setConfig((current) => ({ ...current, readyOnly: event.currentTarget.checked }))}
              />
              Ready Only
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.hasCover}
                onChange={(event) => setConfig((current) => ({ ...current, hasCover: event.currentTarget.checked }))}
              />
              Has Cover
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.hasExperience}
                onChange={(event) => setConfig((current) => ({ ...current, hasExperience: event.currentTarget.checked }))}
              />
              Song Experience Ready
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.hasSongSheet}
                onChange={(event) => setConfig((current) => ({ ...current, hasSongSheet: event.currentTarget.checked }))}
              />
              Has Song Sheet
            </label>
          </div>
          <div className="ops-live-control__controls" style={{ marginTop: "0.75rem" }}>
            <button type="button" disabled={busy || running} onClick={saveConfig}>
              Save Settings
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
