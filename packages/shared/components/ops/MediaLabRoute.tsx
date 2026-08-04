import type { Metadata } from "next";
import { Suspense } from "react";

import { MediaLabWorkspace } from "@/components/ops/media-lab/MediaLabWorkspace";

export const mediaLabMetadata: Metadata = { title: "Media Lab — BobOS", robots: { index: false, follow: false } };

export async function renderMediaLabRoute(props: { searchParams: Promise<{ collection?: string; episode?: string; mode?: string; performance?: string; return?: string; library?: string }> }) {
  const params = await props.searchParams;
  if (params.mode === "clip_review" && params.episode && params.performance) {
    const search = new URLSearchParams();
    search.set("library", "performances");
    search.set("collection", (params.collection ?? "midnight-special").replace(/-/g, "_"));
    search.set("episode", params.episode);
    search.set("performance", params.performance);
    return { redirect: `/bobos/media-lab?${search.toString()}` } as const;
  }
  if (process.env.RETROVERSE_OPS !== "1") {
    return <main className="ops-page"><div className="ops-page__grain" aria-hidden /><div className="ops-page__inner"><div className="ops-auth"><h1>Media Lab</h1><p className="ops-dim">Ops disabled (set RETROVERSE_OPS=1).</p></div></div></main>;
  }
  return <main className="ops-page ops-page--media-lab-workspace"><div className="ops-page__grain" aria-hidden /><div className="ops-page__inner">
    <Suspense fallback={<p className="ops-dim">Loading workspace…</p>}><MediaLabWorkspace /></Suspense>
  </div></main>;
}
