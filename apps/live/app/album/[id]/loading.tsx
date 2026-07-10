import Link from "next/link";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./album-page-v1.css";

export default function AlbumLoading() {
  return (
    <Rv2PublicShell className="rv2-album rv2-album-editorial" activeNav="search">
      <article className="album-ed" aria-busy="true" aria-label="Loading album">
        <header className="album-ed__hero">
          <Link href="/search" prefetch className="album-ed__back">
            ← Search
          </Link>
          <div className="album-ed__hero-stage">
            <div className="album-ed__cover-wrap">
              <div className="album-ed__cover album-ed__cover--fallback" aria-hidden />
            </div>
            <div className="album-ed__hero-copy">
              <p className="album-ed__kicker">Album</p>
              <h1 className="album-ed__title">…</h1>
              <p className="album-ed__artist-line">…</p>
            </div>
          </div>
        </header>
      </article>
    </Rv2PublicShell>
  );
}
