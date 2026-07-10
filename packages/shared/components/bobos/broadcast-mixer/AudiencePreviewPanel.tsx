"use client";

import { useEffect, useRef, useState } from "react";

import type { BroadcastStatus } from "@/app/bobos/broadcast/actions";
import { PresentationStage } from "@/components/retroverse-live/PresentationStage";

type Props = {
  status: BroadcastStatus;
};

const PUBLIC_SYNC_LABELS: Record<BroadcastStatus["publicSync"]["state"], string> = {
  synced: "Synced with retroverse.live",
  drift: "Drift from retroverse.live",
  unreachable: "retroverse.live unreachable",
  unconfigured: "Public push not configured",
  "off-air": "Off air",
};

/**
 * Non-interactive — shows exactly what retroverse.live is currently
 * showing, via the same PresentationStage the public player renders.
 */
export function AudiencePreviewPanel({ status }: Props) {
  const local = status.local;
  const frameRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void frameRef.current?.requestFullscreen();
  }

  return (
    <section className="bmx-audience" aria-label="Audience Preview">
      <header className="bmx-audience__head">
        <h2 className="bmx-audience__title">Audience Preview</h2>
        <div className="bmx-audience__head-actions">
          <span className={`bmx-audience__badge${local.onAir ? " bmx-audience__badge--live" : ""}`}>
            {local.onAir ? "ON AIR" : "OFF AIR"}
          </span>
          <button
            type="button"
            className="bmx-audience__open-link"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
          >
            {isFullscreen ? "⤡" : "⤢"}
          </button>
        </div>
      </header>

      <div className="bmx-audience__frame" ref={frameRef}>
        <div className="bmx-audience__notch" aria-hidden="true" />
        <div className="bmx-audience__stage" aria-hidden="true">
          <PresentationStage
            rvba={local.rvba}
            broadcast={local.broadcast}
            offAirTitle="Retroverse Live"
          />
        </div>
      </div>

      <p className="bmx-audience__sync">{PUBLIC_SYNC_LABELS[status.publicSync.state]}</p>
    </section>
  );
}
