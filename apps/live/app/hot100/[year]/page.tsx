import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hot100ArtistHrefs } from "@/lib/hot100/artist-links";
import {
  HOT100_CREDIT,
  hot100Years,
  isHot100Year,
  youtubePlaylistLinks,
} from "@/lib/hot100/chart";
import { loadHot100Year } from "@/lib/hot100/load-year-end";

import { Hot100ChartList } from "../chart-list";
import { Hot100Masthead } from "../masthead";
import { Hot100YearJump } from "../year-jump";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = {
  params: Promise<{ year: string }>;
};

export function generateStaticParams() {
  return hot100Years().map((year) => ({ year: String(year) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = Number((await params).year);
  if (!isHot100Year(year)) return { title: "Hot 100 — Retroverse" };
  return {
    title: `${year} Hot 100 Year-End — Retroverse`,
    description: `The Retroverse ${year} Hot 100 year-end chart. One hundred songs ranked from the weekly charts.`,
  };
}

export default async function Hot100YearPage({ params }: Props) {
  const year = Number((await params).year);
  if (!isHot100Year(year)) notFound();
  const songs = await loadHot100Year(year);
  if (!songs) notFound();

  const artistHrefs = await hot100ArtistHrefs(songs.map((song) => song.artist));
  const playlists = youtubePlaylistLinks(songs.flatMap((song) => (song.youtubeId ? [song.youtubeId] : [])));
  const previous = isHot100Year(year - 1) ? year - 1 : null;
  const next = isHot100Year(year + 1) ? year + 1 : null;
  const numberOne = songs[0];

  return (
    <main className="hot100-sheet">
      <Hot100Masthead
        kicker="Year-end Hot 100"
        title={String(year)}
        lede={numberOne ? `No. 1 · ${numberOne.title} — ${numberOne.artist}` : undefined}
      >
        <Hot100YearJump id="hot100-chart-year" current={year} />
        <nav className="hot100-pager" aria-label="Other years">
          {previous ? (
            <Link href={`/hot100/${previous}`} aria-label={`Previous year, ${previous}`}>
              <span aria-hidden="true">← </span>
              {previous}
            </Link>
          ) : (
            <span />
          )}
          <Link href="/hot100">All years</Link>
          {next ? (
            <Link href={`/hot100/${next}`} aria-label={`Next year, ${next}`}>
              {next}
              <span aria-hidden="true"> →</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
        <div className="hot100-play-year">
          <Link href={`/ranker?year=${year}`}>Rank {year}</Link>
          {playlists.map((playlist) => (
            <a key={playlist.label} href={playlist.href} target="_blank" rel="noopener noreferrer">
              {playlist.label}
            </a>
          ))}
        </div>
      </Hot100Masthead>

      <Hot100ChartList songs={songs} artistHrefs={artistHrefs} />

      <nav className="hot100-year-rail" aria-label="All Hot 100 years">
        {hot100Years().map((item) => (
          <Link key={item} href={`/hot100/${item}`} aria-current={item === year ? "page" : undefined}>
            {item}
          </Link>
        ))}
      </nav>

      <footer className="hot100-foot">
        <p>{HOT100_CREDIT}</p>
      </footer>
    </main>
  );
}
