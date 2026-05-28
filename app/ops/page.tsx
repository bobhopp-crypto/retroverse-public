import type { Metadata } from "next";
import Link from "next/link";

import { OpsBoard } from "@/components/ops/OpsBoard";
import { loadOpsConsoleData } from "@/lib/ops/load-ops-data";

import "./ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ops Console — Retroverse (internal)",
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
  const ops = await loadOpsConsoleData();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · operations</p>
            <h1 className="ops-topbar__title">Ops</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Snapshot <strong>{now}</strong>
            </div>
            <div>
              Year {ops.year} · match · acquisition · refresh · activity ·{" "}
              <Link className="ops-link" href="/ops/media-sync">
                media-sync
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/acquisition">
                acquisition
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/healing">
                healing
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/covers">
                Cover Review
              </Link>
            </div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Chart-to-library reconciliation</strong> — Billboard cultural universe with
          VDJ playable-media overlay. Complete <strong>{ops.year}</strong> first.
          {ops.status.pgOk ? (
            <>
              {" "}
              Live Postgres
              {ops.status.yearStats
                ? ` · ${ops.status.yearStats.matched} matched / ${ops.status.yearStats.missing} missing (${ops.status.yearStats.chartRows} songs)`
                : " · year match table loads after page shell"}
              {ops.status.partial.length
                ? ` · ${ops.status.partial.join("; ")}`
                : ""}
              .
            </>
          ) : (
            <>
              {" "}
              <strong>Postgres offline</strong>
              {ops.status.pgError ? ` (${ops.status.pgError})` : ""}.
            </>
          )}
        </p>

        <OpsBoard
          year={ops.year}
          yearMatch={ops.yearMatch}
          acquisition={ops.acquisition}
          weeklyRefresh={ops.weeklyRefresh}
          recentActivity={ops.recentActivity}
          yearStats={ops.status.yearStats}
        />
      </div>
    </main>
  );
}

