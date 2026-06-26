type Props = {
  show: boolean;
};

export function CollectorReadyPanel({ show }: Props) {
  if (!show) return null;

  return (
    <section className="ops-studio-collector__ready" aria-labelledby="collector-ready">
      <h2 id="collector-ready" className="ops-studio-collector__ready-title">
        Collector Ready
      </h2>
      <p className="ops-studio-collector__ready-lead">
        This department gathers everything Retroverse knows about a song.
      </p>
      <p className="ops-studio-collector__ready-sub">It combines:</p>
      <ul className="ops-studio-collector__ready-list">
        <li>Retroverse</li>
        <li>VirtualDJ</li>
        <li>Wikipedia</li>
        <li>MusicBrainz</li>
        <li>Discogs</li>
        <li>Video analysis (future)</li>
        <li>Audio analysis (future)</li>
      </ul>
      <p className="ops-studio-collector__ready-next">
        <strong>Next step:</strong> Run a research job.
      </p>
    </section>
  );
}
