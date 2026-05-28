export default function ArtistLoading() {
  return (
    <div
      className="artist-exhibit__body artist-exhibit__body--loading"
      aria-busy="true"
      aria-label="Loading artist exhibit"
    >
      <p className="artist-placeholder__note">Opening exhibit from the archive…</p>
    </div>
  );
}
