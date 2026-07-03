import type { Metadata } from "next";

import { isAllowedDiscogsEmbedUrl } from "@/lib/cover-integrity/discogs-url";

import "../../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discogs Embed — Ops",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ url?: string }>;
};

export default async function OpsCoversDiscogsEmbedPage({ searchParams }: Props) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return <p>Not available</p>;
  }

  const sp = await searchParams;
  const url = sp.url?.trim() ?? "";
  const allowed = url && isAllowedDiscogsEmbedUrl(url);

  return (
    <div className="ops-discogs-embed">
      <div className="ops-discogs-embed__bar">
        <a className="ops-discogs-embed__ext" href={allowed ? url : "#"} target="_blank" rel="noopener noreferrer">
          Open in new tab ↗
        </a>
      </div>
      {allowed ? (
        <iframe
          className="ops-discogs-embed__frame"
          src={url}
          title="Discogs search"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <p className="ops-discogs-embed__blocked">Invalid or missing Discogs URL.</p>
      )}
      <p className="ops-discogs-embed__note">
        If the frame is blank, Discogs may block embedding — use “Open in new tab”.
      </p>
    </div>
  );
}
