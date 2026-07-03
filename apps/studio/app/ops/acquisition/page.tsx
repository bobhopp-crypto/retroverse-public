import type { Metadata } from "next";
import Link from "next/link";

import OpsAcquisitionBoard from "@/components/ops/OpsAcquisitionBoard";
import { loadAcquisitionConsoleData } from "@/lib/ops/load-acquisition-console";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acquisition Export — Retroverse Ops (internal)",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Acquisition Export</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function OpsAcquisitionPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <OpsBlocked message="Ops disabled (set RETROVERSE_OPS=1)." />
        </div>
      </main>
    );
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const data = await loadAcquisitionConsoleData();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · acquisition intelligence</p>
            <h1 className="ops-topbar__title">YouTube Playlist Export</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Snapshot <strong>{now}</strong>
            </div>
            <div>
              <Link className="ops-link" href="/ops">
                ← Year Match
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/media-sync">
                media-sync
              </Link>
            </div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>{data.year} Hot 100 acquisition universe</strong> — generate YouTube search URLs
          for chart rows (Softorino / browser workflows). No media downloads.
          {data.pgOk ? (
            <>
              {" "}
              Live Postgres · {data.stats.chartRows} rows · {data.stats.acquisition} acquisition
              targets.
            </>
          ) : (
            <>
              {" "}
              <strong>Postgres offline</strong>
              {data.pgError ? ` (${data.pgError})` : ""}.
            </>
          )}
        </p>

        <OpsAcquisitionBoard
          year={data.year}
          initialRows={data.yearMatch}
          acquisitionQueueSize={data.acquisitionQueue.length}
          pgOk={data.pgOk}
          pgError={data.pgError}
        />
      </div>
    </main>
  );
}
