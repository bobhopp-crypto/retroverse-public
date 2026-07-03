import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import {
  buildCardsFromReview,
  processSong,
} from "@/lib/ops/intelligence/process-song";
import {
  saveCoverCandidate,
  storeCanonicalCover,
} from "@/lib/retroverse-2/cover-correction";
import {
  loadSongControlPackage,
  mergeSongControl,
  saveSongControlPackage,
  songControlData,
  type SongControlData,
  type SongControlPackage,
} from "@/lib/retroverse-2/song-control";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";

import { CoverDrawer } from "./cover-drawer";

import "../../../live/retroverse-live-2.css";
import "../retroverse-song-2.css";
import "./song-data.css";

type Props = {
  params: Promise<{ rvtr: string }>;
  searchParams: Promise<{ coverUpdated?: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Song Control Center — Retroverse 2.0",
};

function numberValue(value: FormDataEntryValue | null): number | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function textValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function ensurePackage(track: TrackPageData): Promise<SongControlPackage> {
  return loadSongControlPackage(track);
}

function controlValue(control: SongControlData, key: keyof SongControlData["story"]): string {
  return control.story[key]?.trim() ?? "";
}

export default async function SongDataPage({ params, searchParams }: Props) {
  const { rvtr } = await params;
  const { coverUpdated } = await searchParams;
  const track = await loadTrackPage(rvtr);
  if (!track) notFound();

  const pkg = await ensurePackage(track);
  const control = songControlData(pkg);
  const coverDisplayUrl = track.coverUrl ?? pkg.metadata.coverUrl;
  const locked = {
    cover: control.locks.cover === true,
    year: control.locks.year === true,
    album: control.locks.album === true,
    storyContent: control.locks.storyContent === true,
  };
  async function saveCoverCandidateAction(formData: FormData) {
    "use server";
    const rawLinkId = formData.get("linkId");
    const rawCoverUrl = formData.get("coverUrl");
    const linkId = numberValue(rawLinkId);
    const coverUrl = typeof rawCoverUrl === "string" ? rawCoverUrl.trim() : "";
    await saveCoverCandidate({ rvtr, linkId, coverUrl });
    redirect(`/retroverse-2/song/${rvtr}/data?coverUpdated=1`);
  }

  async function uploadCoverAction(formData: FormData) {
    "use server";
    const file = formData.get("cover");
    if (!(file instanceof File) || file.size === 0) return;
    const bytes = Buffer.from(await file.arrayBuffer());
    await storeCanonicalCover({
      rvtr,
      bytes,
      contentType: file.type,
      filename: file.name,
      source: "manual_upload",
    });
    redirect(`/retroverse-2/song/${rvtr}/data?coverUpdated=1`);
  }

  async function saveIdentity(formData: FormData) {
    "use server";
    const current = await loadTrackPage(rvtr);
    if (!current) return;
    const currentPkg = await ensurePackage(current);
    const year = numberValue(formData.get("year"));
    await saveSongControlPackage({
      ...currentPkg,
      metadata: {
        ...currentPkg.metadata,
        rvtr: textValue(formData.get("rvtr")) || currentPkg.metadata.rvtr,
        title: textValue(formData.get("title")) || currentPkg.metadata.title,
        artist: textValue(formData.get("artist")) || currentPkg.metadata.artist,
        year,
        albumTitle: textValue(formData.get("album")) || null,
      },
      processLog: [...currentPkg.processLog, `${new Date().toISOString()} · Identity saved via Retroverse 2.0 Data`],
    });
    revalidatePath(`/retroverse-2/song/${rvtr}`);
    revalidatePath(`/retroverse-2/song/${rvtr}/data`);
  }

  async function saveFacts(formData: FormData) {
    "use server";
    const current = await loadTrackPage(rvtr);
    if (!current) return;
    const currentPkg = await ensurePackage(current);
    const peak = numberValue(formData.get("peakPosition"));
    await saveSongControlPackage(mergeSongControl({
      ...currentPkg,
      metadata: {
        ...currentPkg.metadata,
        peakHot100: peak,
      },
    }, {
      facts: {
        peakPosition: textValue(formData.get("peakPosition")),
        length: textValue(formData.get("length")),
        label: textValue(formData.get("label")),
        releaseDate: textValue(formData.get("releaseDate")),
      },
    }));
    revalidatePath(`/retroverse-2/song/${rvtr}`);
    revalidatePath(`/retroverse-2/song/${rvtr}/data`);
  }

  async function saveStory(formData: FormData) {
    "use server";
    const current = await loadTrackPage(rvtr);
    if (!current) return;
    const currentPkg = await ensurePackage(current);
    await saveSongControlPackage(mergeSongControl(currentPkg, {
      story: {
        aboutSong: textValue(formData.get("aboutSong")),
        aboutArtist: textValue(formData.get("aboutArtist")),
        theYear: textValue(formData.get("theYear")),
        exploreFurther: textValue(formData.get("exploreFurther")),
      },
    }));
    revalidatePath(`/retroverse-2/song/${rvtr}`);
    revalidatePath(`/retroverse-2/song/${rvtr}/data`);
  }

  async function saveLocks(formData: FormData) {
    "use server";
    const current = await loadTrackPage(rvtr);
    if (!current) return;
    const currentPkg = await ensurePackage(current);
    await saveSongControlPackage(mergeSongControl(currentPkg, {
      locks: {
        cover: formData.get("cover") === "on",
        year: formData.get("year") === "on",
        album: formData.get("album") === "on",
        storyContent: formData.get("storyContent") === "on",
      },
    }));
    revalidatePath(`/retroverse-2/song/${rvtr}`);
    revalidatePath(`/retroverse-2/song/${rvtr}/data`);
  }

  async function refreshSources() {
    "use server";
    await processSong(rvtr);
    revalidatePath(`/retroverse-2/song/${rvtr}/data`);
  }

  async function rebuildPackage() {
    "use server";
    await buildCardsFromReview(rvtr);
    revalidatePath(`/retroverse-2/song/${rvtr}/data`);
  }

  return (
    <main className="rv2-live rv2-song rv2-data">
      <div className="rv2-live__grid-glow" aria-hidden />
      <header className="rv2-live__topbar">
        <Link href="/" className="rv2-live__brand" aria-label="Retroverse home">
          Retroverse
        </Link>
        <nav className="rv2-live__nav" aria-label="Retroverse sections">
          <Link href={`/retroverse-2/song/${track.rvtr}`}>Song</Link>
          <Link href="/retroverse-2/live">Live</Link>
          <Link href="/search">Search</Link>
        </nav>
      </header>

      <section className="rv2-live__search-panel" aria-label="Global search">
        <form className="rv2-live__search" action="/search">
          <input name="q" type="search" placeholder="Search music..." />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="rv2-data__hero">
        <p className="rv2-live__eyebrow">Song Control Center</p>
        <h1>{track.title}</h1>
        <p>{track.artistName}</p>
        {coverUpdated === "1" ? (
          <p className="rv2-data__success" role="status">Cover updated</p>
        ) : null}
      </section>

      <section className="rv2-data__card rv2-data__card--priority">
        <h2>Cover Manager</h2>
        <CoverDrawer
          currentUrl={coverDisplayUrl}
          album={pkg.metadata.albumTitle ?? track.albums[0]?.title ?? "Unknown"}
          source="album_artwork_links"
          locked={locked.cover}
          saveCandidateAction={saveCoverCandidateAction}
          uploadCoverAction={uploadCoverAction}
          candidatesUrl={`/retroverse-2/song/${track.rvtr}/data/cover/candidates`}
        />
      </section>

      <section className="rv2-data__card">
        <h2>Song Identity</h2>
        <form action={saveIdentity} className="rv2-data__form">
          <label>RVTR<input name="rvtr" defaultValue={pkg.metadata.rvtr} /></label>
          <label>Title<input name="title" defaultValue={pkg.metadata.title || track.title} /></label>
          <label>Artist<input name="artist" defaultValue={pkg.metadata.artist || track.artistName} /></label>
          <label>Year<input name="year" defaultValue={String(pkg.metadata.year ?? track.releaseYear ?? "")} /></label>
          <label>Album<input name="album" defaultValue={pkg.metadata.albumTitle ?? track.albums[0]?.title ?? ""} /></label>
          <button type="submit">Save Identity</button>
        </form>
      </section>

      <section className="rv2-data__card">
        <h2>Facts</h2>
        <form action={saveFacts} className="rv2-data__form">
          <label>Peak Position<input name="peakPosition" defaultValue={control.facts.peakPosition ?? String(pkg.metadata.peakHot100 ?? track.peakHot100 ?? "")} /></label>
          <label>Length<input name="length" defaultValue={control.facts.length ?? ""} /></label>
          <label>Label<input name="label" defaultValue={control.facts.label ?? pkg.intel.label ?? ""} /></label>
          <label>Release Date<input name="releaseDate" defaultValue={control.facts.releaseDate ?? track.firstChartDate ?? ""} /></label>
          <button type="submit">Save Facts</button>
        </form>
      </section>

      <section className="rv2-data__card">
        <h2>Story Content</h2>
        <form action={saveStory} className="rv2-data__form">
          <label>About The Song<textarea name="aboutSong" defaultValue={controlValue(control, "aboutSong")} /></label>
          <label>About The Artist<textarea name="aboutArtist" defaultValue={controlValue(control, "aboutArtist")} /></label>
          <label>The Year<textarea name="theYear" defaultValue={controlValue(control, "theYear")} /></label>
          <label>Explore Further<textarea name="exploreFurther" defaultValue={controlValue(control, "exploreFurther")} /></label>
          <button type="submit">Save Story</button>
        </form>
      </section>

      <section className="rv2-data__card">
        <h2>Sources</h2>
        <div className="rv2-data__source-list">
          <p>Retroverse canonical track display</p>
          <p>album_artwork_links</p>
          {pkg.researchVault.map((source) => (
            <p key={source.id}>{source.source}</p>
          ))}
          {pkg.candidateFacts.some((fact) => fact.sourceType === "operator") ? <p>Manual Override</p> : null}
        </div>
      </section>

      <section className="rv2-data__card">
        <h2>Rebuild Actions</h2>
        <div className="rv2-data__actions">
          <form action={refreshSources}><button type="submit">Refresh Sources</button></form>
          <button disabled>Find Better Cover · use Fix Cover</button>
          <form action={rebuildPackage}><button type="submit">Rebuild Package</button></form>
          <button disabled>Rebuild Deck · no direct deck builder action</button>
          <button disabled>Rebuild Everything · requires pipeline orchestration</button>
        </div>
      </section>

      <section className="rv2-data__card">
        <h2>Overrides</h2>
        <form action={saveLocks} className="rv2-data__locks">
          <label><input type="checkbox" name="cover" defaultChecked={locked.cover} /> Cover</label>
          <label><input type="checkbox" name="year" defaultChecked={locked.year} /> Year</label>
          <label><input type="checkbox" name="album" defaultChecked={locked.album} /> Album</label>
          <label><input type="checkbox" name="storyContent" defaultChecked={locked.storyContent} /> Story Content</label>
          <button type="submit">Save Locks</button>
        </form>
      </section>
    </main>
  );
}
