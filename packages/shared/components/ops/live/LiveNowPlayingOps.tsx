"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import type { BridgeProcessManifest } from "@/lib/sunday-nights/bridge-status";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";

type Props = {
  initial: SundayNightsCurrentPayload;
  bridgeManifest: BridgeProcessManifest | null;
  bridgeRunning: boolean;
};

export function LiveNowPlayingOps({ initial, bridgeManifest, bridgeRunning }: Props) {
  const [payload, setPayload] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SundayNightsCurrentPayload;
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const live = payload.live;

  return (
    <div className="live-ops">
      <div className="live-ops__toolbar">
        <button
          type="button"
          className="live-ops__refresh"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <Link href="/live" className="live-ops__public-link" target="_blank" rel="noreferrer">
          Open /live →
        </Link>
        <Link href="/ops/sunday-nights" className="live-ops__public-link">
          Manual Go Live →
        </Link>
      </div>

      {error ? <p className="live-ops__error">{error}</p> : null}

      <section className="live-ops__section">
        <h2 className="live-ops__section-title">Bridge health</h2>
        <dl className="live-ops__grid">
          <div className="live-ops__row">
            <dt>Bridge process</dt>
            <dd>{bridgeRunning ? "Running" : "Not running"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Bridge PID</dt>
            <dd>{bridgeManifest?.bridge?.pid ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>VDJ port</dt>
            <dd>{bridgeManifest?.vdjPort ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Session started</dt>
            <dd>{bridgeManifest?.startedAt ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Publish API</dt>
            <dd className="live-ops__mono">POST /api/sunday-nights/bridge</dd>
          </div>
        </dl>
      </section>

      <section className="live-ops__section">
        <h2 className="live-ops__section-title">Authoritative live track</h2>
        <p className="live-ops__section-note">
          Same state as <code>/sunday-nights</code> and manual Go Live.
        </p>
        <dl className="live-ops__grid">
          <div className="live-ops__row">
            <dt>Status</dt>
            <dd>{live ? "Live" : "Idle"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Source</dt>
            <dd>{live?.source ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Artist</dt>
            <dd>{live?.artist ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Title</dt>
            <dd>{live?.title ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>RVTR</dt>
            <dd>
              {live?.rvtr ? (
                <Link href={`/track/${live.rvtr}`} className="live-ops__link">
                  {live.rvtr}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="live-ops__row">
            <dt>Resolution</dt>
            <dd>{live?.resolution ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Deck</dt>
            <dd>{live?.deck ?? "—"}</dd>
          </div>
          <div className="live-ops__row live-ops__row--wide">
            <dt>Filepath</dt>
            <dd className="live-ops__mono">{live?.filepath ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Bridge timestamp</dt>
            <dd>{live?.bridgeTimestamp ?? "—"}</dd>
          </div>
          <div className="live-ops__row">
            <dt>Last update</dt>
            <dd>{payload.updatedAt}</dd>
          </div>
        </dl>
      </section>

      <p className="live-ops__hint">
        Bridge logs: <code>RETROVERSE_DATA/live/bridge-*.log</code> · API logs:{" "}
        <code>RETROVERSE_DATA/live/api-*.log</code>
      </p>
    </div>
  );
}
