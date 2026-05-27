export default function ArtistLoading() {
  return (
    <div
      className="artist-exhibit__body artist-exhibit__body--loading"
      aria-busy="true"
      aria-label="Loading"
    >
      <p className="artist-placeholder__note">…</p>
    </div>
  );
}
