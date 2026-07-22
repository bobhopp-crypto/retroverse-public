import { BeyondTheCharts } from "@/components/retroverse/experience/BeyondTheCharts";
import { SongStory } from "@/components/retroverse/experience/SongStory";
import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { buildStoryDisplayCards } from "@/lib/retroverse/experience/story-cards";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";

type Props = {
  rvtr: string;
  /** Preloaded public track page (same loader as live). */
  trackData?: TrackPageData | null;
};

/**
 * Live public experience preview for Song Workspace.
 * Reuses PublicSongExperience + SongPackage chapter components — no parallel renderer.
 */
export async function SongWorkspacePublicPreview({ rvtr, trackData }: Props) {
  const track = trackData === undefined ? await loadTrackPage(rvtr) : trackData;
  const pkg = await loadSongPackage(rvtr);

  if (!track) {
    return (
      <div className="sw-public-preview sw-public-preview--empty">
        <h2 className="exp-insp-panel-title">Public Experience</h2>
        <p>No public song page payload for this RVTR yet.</p>
      </div>
    );
  }

  const storyCards = pkg ? buildStoryDisplayCards(pkg, track).slice(0, 3) : [];
  const timeline = pkg?.intel.timelineEvents ?? [];
  const trivia = (pkg?.candidateFacts ?? [])
    .filter((fact) => fact.category === "trivia")
    .slice(0, 4);
  const quotes = (pkg?.candidateFacts ?? [])
    .filter((fact) => fact.category === "quote")
    .slice(0, 4);
  const youtubeHint =
    pkg?.metadata.videoInfo?.trim() ||
    (pkg?.metadata.hasVdjMedia ? "Local / VDJ video media attached" : null);

  return (
    <div className="sw-public-preview">
      <div className="sw-public-preview__head">
        <h2 className="exp-insp-panel-title">Public Experience</h2>
        <p className="sw-public-preview__note">
          Same public song loaders as Retroverse visitors
        </p>
      </div>

      <div className="sw-public-preview__stage">
        <PublicSongExperience rvtr={rvtr} trackData={track} embedded />
      </div>

      {(storyCards.length > 0 ||
        timeline.length > 0 ||
        trivia.length > 0 ||
        quotes.length > 0 ||
        youtubeHint) && (
        <div className="sw-public-preview__package" aria-label="Song package chapters">
          <h3 className="sw-public-preview__package-title">Package chapters</h3>
          <p className="sw-public-preview__package-note">
            From SongPackage — same sources inventory already reads
          </p>
          {storyCards.length > 0 ? (
            <SongStory heading="Story" cards={storyCards} />
          ) : null}
          {timeline.length > 0 ? (
            <BeyondTheCharts heading="Timeline" events={timeline.slice(0, 6)} />
          ) : null}
          {trivia.length > 0 ? (
            <section className="sw-public-preview__facts">
              <h4>Trivia</h4>
              <ul>
                {trivia.map((fact) => (
                  <li key={fact.id}>{fact.factText}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {quotes.length > 0 ? (
            <section className="sw-public-preview__facts">
              <h4>Quotes</h4>
              <ul>
                {quotes.map((fact) => (
                  <li key={fact.id}>{fact.factText}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {youtubeHint ? (
            <section className="sw-public-preview__facts">
              <h4>Videos</h4>
              <p>{youtubeHint}</p>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
