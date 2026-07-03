import type { Metadata } from "next";
import Link from "next/link";

import OpsMediaCollections from "@/components/ops/media-collections/OpsMediaCollections";
import { ensureMediaCollectionsInitialized } from "@/lib/ops/media-collections/init";
import { loadMediaCollectionsConsole } from "@/lib/ops/media-collections/load";

import "../ops.css";
import "./media-collections.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media Collections — Retroverse Ops (internal)",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Media Collections</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function OpsMediaCollectionsPage() {
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

  await ensureMediaCollectionsInitialized();
  const data = await loadMediaCollectionsConsole();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · acquisition &amp; archive</p>
            <h1 className="ops-topbar__title">Media Collections</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Snapshot <strong>{now}</strong>
            </div>
            <div>
              <Link className="ops-link" href="/ops">
                ← Ops Console
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/media-lab">
                Media Lab
              </Link>
            </div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Acquisition control center</strong> — enumerate playlists, track downloads, and
          route episodes into Media Lab. Collection → Episodes → Download → Process → Media Lab →
          Harvest → Retroverse.
        </p>

        <OpsMediaCollections
          initialCollections={data.collections}
          dataRoot={data.data_root}
        />
      </div>
    </main>
  );
}
