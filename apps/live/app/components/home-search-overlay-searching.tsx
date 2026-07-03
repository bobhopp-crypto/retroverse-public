type Props = {
  compact?: boolean;
};

export function HomeSearchOverlaySearching({ compact = false }: Props) {
  return (
    <div
      className={`home-search-overlay-searching${compact ? " home-search-overlay-searching--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="home-search-overlay-searching__scanner" aria-hidden />
      <span className="home-search-overlay-searching__crate" aria-hidden>
        ◫
      </span>
      <p className="home-search-overlay-searching__copy">Searching the stacks…</p>
    </div>
  );
}
