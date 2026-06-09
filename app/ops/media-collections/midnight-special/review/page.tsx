import type { Metadata } from "next";
import Link from "next/link";

import OpsMidnightSpecialReview from "@/components/ops/media-collections/OpsMidnightSpecialReview";

import "../../ops.css";
import "../../media-collections.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Midnight Special Review — Retroverse Ops (internal)",
  robots: { index: false, follow: false },
};

const POC_EPISODE_ID = "027bA7mICxM";

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Midnight Special Review</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function MidnightSpecialReviewPage(props: {
  searchParams: Promise<{ episode?: string; mode?: string }>;
}) {
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

  const { episode, mode } = await props.searchParams;
  const episodeId = episode?.trim() || POC_EPISODE_ID;
  const reviewMode = mode?.trim() === "queue" ? "queue" : "episode";
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · Structured Collection</p>
            <h1 className="ops-topbar__title">Midnight Special — Performance Review</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Snapshot <strong>{now}</strong>
            </div>
            <div>
              <Link className="ops-link" href="/ops/media-collections/midnight-special">
                ← Collection
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/media-lab?collection=midnight-special&mode=structured_collection">
                Media Lab
              </Link>
            </div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Performance Review</strong> — chapter markers → candidates → accept exact → review
          queue. Export gated until verification passes.
        </p>

        <OpsMidnightSpecialReview initialEpisodeId={episodeId} initialMode={reviewMode} />
      </div>
    </main>
  );
}
