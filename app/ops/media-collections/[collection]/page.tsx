import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import OpsMediaCollectionDetail from "@/components/ops/media-collections/OpsMediaCollectionDetail";
import { ensureMediaCollectionsInitialized } from "@/lib/ops/media-collections/init";
import { loadMediaCollectionDetail } from "@/lib/ops/media-collections/load";
import { collectionIdFromSlug } from "@/lib/ops/media-collections/paths";

import "../../ops.css";
import "../media-collections.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collection Detail — Retroverse Ops (internal)",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Media Collection</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function OpsMediaCollectionDetailPage(props: {
  params: Promise<{ collection: string }>;
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

  const { collection: slug } = await props.params;
  const collectionId = collectionIdFromSlug(slug);

  await ensureMediaCollectionsInitialized();
  const data = await loadMediaCollectionDetail(collectionId);
  if (!data) notFound();

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · {data.collection.title}</p>
            <h1 className="ops-topbar__title">{data.collection.title}</h1>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Snapshot <strong>{now}</strong>
            </div>
            <div>
              <Link className="ops-link" href="/ops/media-collections">
                ← All Collections
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/media-lab">
                Media Lab
              </Link>
            </div>
          </div>
        </header>

        <p className="ops-banner">
          <strong>{data.collection.title}</strong> — episode manifests, storage paths, and pipeline
          status. No Finder required.
        </p>

        <OpsMediaCollectionDetail initial={data} />
      </div>
    </main>
  );
}
