import type { Metadata } from "next";
import Link from "next/link";

import { OpsStructuredCollectionBanner } from "@/components/ops/media-collections/OpsStructuredCollectionBanner";
import { OpsMediaLab } from "@/components/ops/OpsMediaLab";
import { OPS_FOCUS_YEAR } from "@/lib/ops/ops-focus-year";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media Lab — Retroverse Ops",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Media Lab</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function OpsMediaLabPage(props: {
  searchParams: Promise<{ collection?: string; episode?: string; mode?: string }>;
}) {
  const { collection, episode, mode } = await props.searchParams;
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

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · media lab</p>
            <h1 className="ops-topbar__title">Media Lab</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              ← Ops
            </Link>
            <Link className="ops-link" href={`/ops/year/${OPS_FOCUS_YEAR}`}>
              Year {OPS_FOCUS_YEAR}
            </Link>
          </div>
        </header>

        <OpsStructuredCollectionBanner
          collection={collection}
          episode={episode}
          mode={mode}
        />

        <p className="ops-banner">
          <strong>Video → transcript → chapters → save to year.</strong> Local only (ffmpeg +
          faster-whisper). No upload to the cloud.
        </p>

        <OpsMediaLab defaultYear={OPS_FOCUS_YEAR} />
      </div>
    </main>
  );
}
