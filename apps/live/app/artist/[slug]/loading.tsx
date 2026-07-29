import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./artist-page-v1.css";

export default function ArtistLoading() {
  return (
    <Rv2PublicShell className="rv2-artist rv2-explorer" activeNav="search" showTopBroadcastBanner={false}>
      <div className="explorer artist-v1 artist-v1--loading" aria-busy="true">
        <RetroverseBack fallbackHref="/search" fallbackLabel="Search" />
        <p>Opening artist from the archive…</p>
      </div>
    </Rv2PublicShell>
  );
}
