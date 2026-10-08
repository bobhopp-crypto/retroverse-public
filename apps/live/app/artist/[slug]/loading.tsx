import { magazineFontClass } from "@/components/theme/magazine-fonts";

import "@/lib/theme/magazine-tokens.css";
import "./artist-magazine.css";

export default function ArtistLoading() {
  return (
    <main className={`rv2-live rv2-magazine ${magazineFontClass}`}>
      <div className="rv-mag rv-mag-loading">Opening the archive…</div>
    </main>
  );
}
