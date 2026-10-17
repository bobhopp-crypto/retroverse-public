import Link from "next/link";

import { formatChartRun, youtubeWatchUrl, type Hot100Entry } from "@/lib/hot100/chart";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M8 5.2v13.6l11.2-6.8L8 5.2Z" fill="currentColor" />
    </svg>
  );
}

function ArtistCredit({ name, href }: { name: string; href: string | null }) {
  if (!href) return <span className="hot100-artist">{name}</span>;
  return (
    <Link href={href} prefetch={false} className="hot100-artist hot100-artist--link">
      {name}
    </Link>
  );
}

function ChartRow({ song, href, showPlay }: { song: Hot100Entry; href: string | null; showPlay: boolean }) {
  const run = formatChartRun(song.firstChart, song.lastChart);
  return (
    <li className={song.rank === 1 ? "hot100-row hot100-row--lead" : "hot100-row"}>
      <span className="hot100-rank" aria-hidden="true">
        {song.rank}
      </span>
      <div className="hot100-song">
        <p className="hot100-title">{song.title}</p>
        <ArtistCredit name={song.artist} href={href} />
      </div>
      <dl className="hot100-stats">
        <div>
          <dt>Peak</dt>
          <dd className={song.peak === 1 ? "hot100-stat--hot" : undefined}>{song.peak}</dd>
        </div>
        <div>
          <dt>Wks</dt>
          <dd>{song.weeks}</dd>
        </div>
        <div>
          <dt>Top 10</dt>
          <dd>{song.weeksTop10}</dd>
        </div>
        <div className="hot100-stats__run">
          <dt>Chart run</dt>
          <dd>
            <time dateTime={song.firstChart}>{run}</time>
          </dd>
        </div>
      </dl>
      {showPlay ? (
        song.youtubeId ? (
          <a
            className="hot100-play"
            href={youtubeWatchUrl(song.youtubeId)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Play ${song.title} by ${song.artist} on YouTube (opens in a new tab)`}
          >
            <PlayIcon />
            <span>Play</span>
          </a>
        ) : (
          <span className="hot100-play hot100-play--empty" aria-hidden="true" />
        )
      ) : null}
    </li>
  );
}

export function Hot100ChartList({
  songs,
  artistHrefs,
}: {
  songs: readonly Hot100Entry[];
  artistHrefs: ReadonlyMap<string, string | null>;
}) {
  const showPlay = songs.some((song) => song.youtubeId);
  const halves = [songs.slice(0, 50), songs.slice(50)];
  return (
    <div className={showPlay ? "hot100-columns hot100-columns--play" : "hot100-columns"}>
      {halves.map((half) => (
        <ol key={half[0]?.rank ?? 0} className="hot100-chart" start={half[0]?.rank ?? 1}>
          {half.map((song) => (
            <ChartRow
              key={song.rank}
              song={song}
              href={artistHrefs.get(song.artist) ?? null}
              showPlay={showPlay}
            />
          ))}
        </ol>
      ))}
    </div>
  );
}
