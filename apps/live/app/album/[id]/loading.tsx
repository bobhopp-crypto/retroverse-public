import Link from "next/link";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./album-page-v1.css";

export default function AlbumLoading() {
  return (
    <Rv2PublicShell className="rv2-album rv2-explorer" activeNav="search">
      <div className="explorer album-v1" aria-busy="true" aria-label="Loading album">
        <header className="album-v1__hero">
          <Link href="/search" prefetch className="explorer__back">
            ← Search
          </Link>
          <div className="album-v1__hero-main">
            <div className="album-v1__cover-wrap">
              <div className="album-v1__cover album-v1__cover--fallback" aria-hidden />
            </div>
            <div className="album-v1__identity">
              <p className="album-v1__eyebrow">Album</p>
              <h1 className="album-v1__name">…</h1>
              <p className="album-v1__artist-line">…</p>
            </div>
          </div>
        </header>
      </div>
    </Rv2PublicShell>
  );
}
