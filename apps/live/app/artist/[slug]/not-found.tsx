import Link from "next/link";

import "./artist-page.css";

export default function ArtistNotFound() {
  return (
    <div className="artist-exhibit">
      <div className="artist-missing">
        <h1>Artist not found</h1>
        <p>Try a known slug: fleetwood-mac, eagles, madonna, elton-john, bruce-springsteen.</p>
        <p>
          <Link href="/search">Search</Link> · <Link href="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
