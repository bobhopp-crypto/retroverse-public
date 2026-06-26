import Link from "next/link";

type Props = {
  sundayEventActive?: boolean;
};

function SearchIcon() {
  return (
    <svg
      className="track-exhibit-nav__search-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function TrackExhibitNav({ sundayEventActive = false }: Props) {
  return (
    <header className="track-exhibit-nav" aria-label="Site navigation">
      <div className="track-exhibit-nav__primary">
        <Link href="/" prefetch className="track-exhibit-nav__link">
          Home
        </Link>
        <Link
          href="/sunday-nights"
          prefetch
          className={`track-exhibit-nav__link${sundayEventActive ? " track-exhibit-nav__link--live" : ""}`}
        >
          Sunday Nights
        </Link>
        <Link href="/search" prefetch className="track-exhibit-nav__search" aria-label="Search Retroverse">
          <SearchIcon />
          <span>Search</span>
        </Link>
      </div>
      <div className="track-exhibit-nav__secondary">
        <Link href="/search" prefetch className="track-exhibit-nav__secondary-link">
          Artists
        </Link>
        <span className="track-exhibit-nav__sep" aria-hidden>
          ·
        </span>
        <Link href="/retroverse-2/charts" prefetch className="track-exhibit-nav__secondary-link">
          Years
        </Link>
      </div>
    </header>
  );
}

export function TrackEventBackLink() {
  return (
    <Link href="/sunday-nights" prefetch className="track-hero__event-back">
      ← Back to Sunday Nights
    </Link>
  );
}
