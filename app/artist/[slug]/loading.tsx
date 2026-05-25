export default function ArtistLoading() {
  return (
    <div
      className="artist-exhibit__body artist-exhibit__body--loading"
      aria-busy="true"
      aria-label="Loading artist content"
    >
      <p className="artist-section-head">Loading artist file…</p>
    </div>
  );
}
