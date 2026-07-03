import type { Metadata } from "next";
import Link from "next/link";

import OpsMediaSyncBoard from "@/components/ops/OpsMediaSyncBoard";
import { loadMediaSyncConsoleData } from "@/lib/ops/media-sync/load-media-sync-data";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media Sync — Retroverse Ops (internal)",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Media Sync</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function MediaSyncPage() {
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
  const data = await loadMediaSyncConsoleData();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · media integrity</p>
            <h1 className="ops-topbar__title">VDJ VIDEO ↔ R2</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Snapshot <strong>{now}</strong>
            </div>
            <div>
              <Link className="ops-link" href="/ops">
                ← Year Match Console
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/acquisition">
                acquisition export
              </Link>
            </div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Inventory reconciliation</strong> — compare local VDJ VIDEO (
          authoritative playable source) with R2 distribution keys indexed in Postgres.
          Read-only: no sync, no deletes, no mutations to VDJ or R2.
          {data.status.pgOk ? (
            <>
              {" "}
              Live Postgres
              {data.summary.lastRefreshAt
                ? ` · last media_assets touch ${data.summary.lastRefreshAt}`
                : ""}
              .
            </>
          ) : (
            <>
              {" "}
              <strong>Postgres offline</strong>
              {data.status.pgError ? ` (${data.status.pgError})` : ""}.
            </>
          )}
        </p>

        <OpsMediaSyncBoard {...data} />
      </div>
    </main>
  );
}
