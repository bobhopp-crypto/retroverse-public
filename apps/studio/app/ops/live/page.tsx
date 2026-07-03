import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveNowPlayingOps } from "@/components/ops/live/LiveNowPlayingOps";
import {
  isBridgeProcessRunning,
  loadBridgeProcessManifest,
} from "@/lib/sunday-nights/bridge-status";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "./live-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bridge Health — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsLivePage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const state = await loadSundayNightsState();
  const initial = await buildSundayNightsCurrentPayload(state);
  const bridgeManifest = loadBridgeProcessManifest();
  const bridgeRunning = isBridgeProcessRunning();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Sunday Nights · VDJ bridge</p>
            <h1 className="ops-topbar__title">Bridge Health</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              ← Ops
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/sunday-nights">
              Sunday Nights
            </Link>
          </div>
        </header>

        <LiveNowPlayingOps
          initial={initial}
          bridgeManifest={bridgeManifest}
          bridgeRunning={bridgeRunning}
        />
      </div>
    </main>
  );
}
