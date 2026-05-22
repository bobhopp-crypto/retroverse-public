export function SearchFooterTip() {
  return (
    <footer className="search-footer-tip">
      <div className="search-footer-tip__boy" aria-hidden="true">
        <svg viewBox="0 0 48 72" className="search-footer-tip__boy-svg">
          <circle cx="24" cy="14" r="10" fill="#f5c98a" stroke="#12343a" strokeWidth="2" />
          <path
            d="M12 28 Q24 24 36 28 L34 68 Q24 62 14 68 Z"
            fill="#e85d1a"
            stroke="#12343a"
            strokeWidth="2"
          />
          <path d="M30 20 L38 8" stroke="#12343a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="search-footer-tip__copy">
        <p className="search-footer-tip__title">Tip: Click any item to explore more!</p>
        <p className="search-footer-tip__text">
          Albums, songs, artists, and charts take you deeper into music history.
        </p>
      </div>
      <div className="search-footer-tip__crate" aria-hidden="true">
        <svg viewBox="0 0 80 56" className="search-footer-tip__crate-svg">
          <rect x="8" y="24" width="56" height="28" rx="2" fill="#c96a30" stroke="#12343a" strokeWidth="2" />
          <ellipse cx="36" cy="24" rx="18" ry="18" fill="#2d3d40" stroke="#12343a" strokeWidth="2" />
          <circle cx="36" cy="24" r="6" fill="#f5f2ea" />
          <ellipse cx="62" cy="30" rx="10" ry="10" fill="#2d3d40" stroke="#12343a" strokeWidth="2" />
        </svg>
      </div>
    </footer>
  );
}
