import Link from "next/link";

import "./artist-page.css";

export default function ArtistNotFound() {
  return (
    <div className="artist-exhibit">
      <div className="artist-missing">
        <h1>Artist not found</h1>
        <p>Search for an artist to open their canonical record.</p>
        <p>
          <Link href="/search">Search</Link> · <Link href="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
