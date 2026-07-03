import Link from "next/link";

import type { MuseumWallEntry } from "@/lib/ops/studio/publisher/experience/types";

type Props = {
  entries: MuseumWallEntry[];
};

export function MuseumWall({ entries }: Props) {
  return (
    <div className="rs-museum">
      <header className="rs-museum__head">
        <h1 className="rs-museum__title">Museum Wall</h1>
        <p className="rs-museum__lead">
          The best experiences ever produced — Retroverse&apos;s permanent gallery. Nothing editable here. Just taste.
        </p>
        <p className="rs-museum__nav">
          <Link href="/ops/studio/publisher">← Publisher</Link>
          {" · "}
          <Link href="/ops/studio/publisher/lab">Quality Lab</Link>
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="rs-museum__empty">No approved experiences yet. Approve packages in Publisher to fill the wall.</p>
      ) : (
        <div className="rs-museum__grid">
          {entries.map((entry) => (
            <article key={entry.rvtr} className="rs-museum__card">
              <div className="rs-museum__rank">#{entry.rank}</div>
              <div className="rs-museum__cover">
                {entry.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.coverUrl} alt="" />
                ) : (
                  <span>{entry.title.slice(0, 1)}</span>
                )}
              </div>
              <div className="rs-museum__body">
                <p className="rs-museum__artist">{entry.artist}</p>
                <h2 className="rs-museum__song">{entry.title}</h2>
                <p className="rs-museum__scores">
                  {entry.emotionScore}% emotion · {entry.qualityScore}% quality
                </p>
                <p className="rs-museum__class">{entry.publicationClass.replace("_", " ")}</p>
                {entry.isGolden ? <p className="rs-museum__golden">⭐ Golden Package</p> : null}
                {entry.fingerprint.length > 0 ? (
                  <p className="rs-museum__fp">{entry.fingerprint.join(" · ")}</p>
                ) : null}
                <p className="rs-museum__why">{entry.showcaseReason}</p>
                {entry.publisherComment !== entry.showcaseReason ? (
                  <p className="rs-museum__comment">{entry.publisherComment}</p>
                ) : null}
                <Link href={`/experience/${entry.rvtr}`} className="rs-museum__link">
                  View experience →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
