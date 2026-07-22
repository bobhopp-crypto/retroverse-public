"use client";

import { useCallback, useEffect, useState } from "react";

import { getBroadcastStatus, type BroadcastStatus } from "@/app/bobos/broadcast/actions";

/**
 * Broadcast Control — status widget only. Operator controls live in The Booth.
 */

const POLL_MS = 2000;

const PUBLIC_SYNC_LABELS: Record<BroadcastStatus["publicSync"]["state"], string> = {
  synced: "Synced",
  drift: "Drift",
  unreachable: "Unreachable",
  unconfigured: "Not configured",
  "off-air": "Off air",
};

function statusLabel(status: BroadcastStatus | null): string {
  const local = status?.local;
  if (!local) return "—";
  if (!local.onAir) return "Off Air";
  const mode = local.autoFollowVdj && !local.manualTakeActive ? "Auto" : "Manual";
  return `On Air · ${mode}`;
}

export function BroadcastPanel({ initialStatus }: { initialStatus: BroadcastStatus | null }) {
  const [status, setStatus] = useState<BroadcastStatus | null>(initialStatus);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const next = await getBroadcastStatus();
        if (!cancelled) setStatus(next);
      } catch {
        // transient — next poll recovers
      }
    }
    if (!initialStatus) void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initialStatus]);

  const local = status?.local ?? null;

  return (
    <>
      <ul className="cockpit-panel__metrics" aria-label="Broadcast status">
        <li>Current Broadcast: {local?.presentation?.title ?? "—"}</li>
        <li>Current Asset: {local?.item?.title ?? "—"}</li>
        <li>Status: {statusLabel(status)}</li>
        <li>Public Sync: {status ? PUBLIC_SYNC_LABELS[status.publicSync.state] : "Checking…"}</li>
      </ul>

      <div className="cockpit-panel__actions">
        <a href="/bobos/booth" className="cockpit-panel__btn cockpit-panel__btn--primary">
          Open The Booth
        </a>
        <a
          href="http://localhost:3100/"
          target="_blank"
          rel="noopener noreferrer"
          className="cockpit-panel__btn cockpit-panel__btn--secondary"
        >
          Open Local
        </a>
        <a
          href={status?.publicPlayerUrl ?? "https://retroverse.live/"}
          target="_blank"
          rel="noopener noreferrer"
          className="cockpit-panel__btn cockpit-panel__btn--secondary"
        >
          Open Public
        </a>
      </div>
    </>
  );
}
