import type { Metadata } from "next";
import Link from "next/link";

import { OpsHome } from "@/components/ops/OpsHome";
import { OpsDirectory } from "@/components/ops/OpsDirectory";
import { loadOpsHomeData } from "@/lib/ops/load-ops-home";
import { trackPageHref } from "@/lib/search/entity-routes";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import "./ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ops Home — Retroverse (internal)",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Retroverse Ops Console</h1>
      <p className="ops-dim">{props.message}</p>
      <p>This route is internal-only and is protected by middleware.</p>
      <p>
        Environment required: <code>RETROVERSE_OPS=1</code>
        <br />
        Access via <code>/internal/ops-pin</code> (local PIN gate).
      </p>
    </div>
  );
}

export default async function OpsPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <OpsBlocked message="Ops console disabled (set RETROVERSE_OPS=1)." />
        </div>
      </main>
    );
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const [home, liveState] = await Promise.all([loadOpsHomeData(), loadSundayNightsState()]);
  const liveRvtr = liveState.currentTrackId;
  const liveTrackHref = liveRvtr ? trackPageHref(liveRvtr) : "/sunday-nights";
  const liveTrackLabel = liveState.live
    ? `${liveState.live.artist} — ${liveState.live.title}`
    : liveRvtr
      ? `Live track · ${liveRvtr}`
      : "Current Live Track";

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · operations</p>
            <h1 className="ops-topbar__title">Ops Home</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Snapshot <strong>{now}</strong>
            </div>
            <div>
              <Link className="ops-link" href="/ops/finance">
                Finance
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/atlas/1970s">
                Library Atlas
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/sunday-nights">
                Sunday Nights
              </Link>
            </div>
          </div>
        </header>

        <OpsHome data={home} />

        <details className="ops-home__directory-fold">
          <summary className="ops-home__directory-summary">All ops tools</summary>
          <OpsDirectory liveTrackHref={liveTrackHref} liveTrackLabel={liveTrackLabel} />
        </details>
      </div>
    </main>
  );
}

