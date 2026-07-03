"use client";

import Link from "next/link";
import { useState } from "react";

import { MissionAlbumSlot } from "@/components/atlas/mission/MissionAlbumSlot";
import { MissionCommentarySlot } from "@/components/atlas/mission/MissionCommentarySlot";
import { MissionMediaSlot } from "@/components/atlas/mission/MissionMediaSlot";
import type { MissionGap, MissionWorkspace } from "@/lib/atlas/mission-types";
import { atlasMissionHref } from "@/lib/atlas/mission-href";

import { AtlasCoverArt, AtlasProgressBar, AtlasProgressRing } from "./AtlasVisuals";

type Props = {
  initialWorkspace: MissionWorkspace;
  initialCoverUrl: string | null;
  relatedCovers: Record<string, string | null>;
};

export function MissionCardClient({
  initialWorkspace,
  initialCoverUrl,
  relatedCovers,
}: Props) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);

  const rankLabel =
    workspace.rank > 0
      ? `#${workspace.rank} of ${workspace.totalRanked} in ${workspace.territory}`
      : `Enrichment target in ${workspace.territory}`;

  const albumsCampaign = workspace.campaigns.find((c) => c.key === "albums");

  const applyWorkspace = (next: MissionWorkspace, nextCover?: string | null) => {
    setWorkspace(next);
    if (nextCover !== undefined) setCoverUrl(nextCover);
  };

  return (
    <div className="atlas-mcard-page">
      <header className="atlas-mcard-page__top">
        <Link href={workspace.territoryHref} className="atlas-mcard-page__back" prefetch>
          ← {workspace.territory} Territory
        </Link>
        <p className="atlas-mcard-page__crumb">
          {workspace.verb?.toUpperCase() ?? "MISSION"} MISSION · {rankLabel}
        </p>
        <span
          className={`atlas-mission-stamp atlas-mission-stamp--${slugStatus(workspace.status)}`}
        >
          {workspace.status}
        </span>
        {workspace.next ? (
          <Link
            href={atlasMissionHref(workspace.next.rvtr)}
            className="atlas-mcard-page__queue-next"
            prefetch
          >
            {workspace.next.title} →
          </Link>
        ) : (
          <span className="atlas-mcard-page__queue-spacer" />
        )}
      </header>

      <section className="atlas-mcard-hero" aria-label="Mission card front">
        <div className="atlas-mcard-hero__art-wrap">
          <AtlasCoverArt
            src={coverUrl}
            alt={`${workspace.artist} — ${workspace.title}`}
            className="atlas-mcard-hero__art"
            priority
          />
        </div>

        <div className="atlas-mcard-hero__identity">
          <p className="atlas-kicker atlas-kicker--orange">{workspace.verb} mission</p>
          <h1 className="atlas-mcard-hero__title">{workspace.title}</h1>
          <p className="atlas-mcard-hero__artist">{workspace.artist}</p>
          <p className="atlas-mcard-hero__meta">
            {workspace.performanceYear ? `${workspace.performanceYear} · ` : ""}
            {workspace.playCount} plays
            {workspace.peakHot100 ? ` · Hot 100 #${workspace.peakHot100}` : ""}
          </p>
          <div className="atlas-mcard-hero__metrics">
            <StatPill label="Shelf coverage" value={`${workspace.shelfCoveragePct}%`} />
            <StatPill label="Priority" value={String(workspace.priority)} accent />
            <StatPill label="Points earned" value={String(workspace.pointsEarned)} />
          </div>
        </div>

        <div className="atlas-mcard-hero__score">
          <AtlasProgressRing
            pct={workspace.exhibitDepthPct}
            label="Exhibit depth"
            tone="orange"
            className="atlas-mcard-hero__ring"
          />
          <p className="atlas-mcard-hero__reward">
            +{workspace.pointsAvailable} available · +{workspace.completeBonus} bonus
          </p>
        </div>
      </section>

      <section className="atlas-mcard-fill" aria-labelledby="mcard-fill-heading">
        <div className="atlas-mcard-fill__head">
          <h2 id="mcard-fill-heading" className="atlas-mcard-fill__title">
            Review research
          </h2>
          <p className="atlas-mcard-fill__summary">
            {workspace.researchBrief?.headline ?? (
              <>
                <strong>{workspace.gaps.length}</strong> slots to approve ·{" "}
                <strong>+{workspace.pointsAvailable}</strong> pts available
              </>
            )}
          </p>
        </div>

        {workspace.gaps.length > 0 ? (
          <ul className="atlas-mcard-slots atlas-mcard-slots--action">
            {workspace.gaps.map((gap) => (
              <li key={gap.id} className="atlas-mcard-slot">
                <SlotHead gap={gap} />
                <div className="atlas-mcard-slot__embed" aria-label={`${gap.label} action panel`}>
                  {gap.kind === "album" ? (
                    <MissionAlbumSlot
                      rvtr={workspace.rvtr}
                      candidates={workspace.albumCandidates}
                      researchHeadline={workspace.albumResearchHeadline}
                      writesEnabled={workspace.albumWritesEnabled}
                      onSaved={applyWorkspace}
                    />
                  ) : gap.kind === "commentary" ? (
                    <MissionCommentarySlot
                      rvtr={workspace.rvtr}
                      commentary={workspace.commentary}
                      onSaved={applyWorkspace}
                    />
                  ) : gap.kind === "tv" ? (
                    <MissionMediaSlot
                      rvtr={workspace.rvtr}
                      kind="tv"
                      candidates={workspace.tvCandidates}
                      researchHeadline={workspace.tvResearchHeadline}
                      onSaved={applyWorkspace}
                    />
                  ) : gap.kind === "movie" ? (
                    <MissionMediaSlot
                      rvtr={workspace.rvtr}
                      kind="movie"
                      candidates={workspace.movieCandidates}
                      researchHeadline={workspace.movieResearchHeadline}
                      onSaved={applyWorkspace}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="atlas-mcard-fill__complete">Research approved — card fortified.</p>
        )}

        {workspace.deferredSlots.length > 0 ? (
          <ul className="atlas-mcard-deferred" aria-label="Later slots">
            {workspace.deferredSlots.map((slot) => (
              <li key={slot.id} className="atlas-mcard-deferred__item">
                <span>{slot.label}</span>
                <span className="atlas-mcard-deferred__phase">D3</span>
              </li>
            ))}
          </ul>
        ) : null}

        {workspace.seals.length > 0 ? (
          <ul className="atlas-mcard-seals" aria-label="Card seals">
            {workspace.seals.map((seal) => (
              <li key={seal.id} className="atlas-mcard-seal">
                <span aria-hidden>✓</span> {seal.label}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {workspace.relatedByArtist.length > 0 ? (
        <section className="atlas-mcard-shelf" aria-labelledby="mcard-shelf-heading">
          <h2 id="mcard-shelf-heading" className="atlas-kicker">
            Same artist shelf — {workspace.artist}
          </h2>
          <ul className="atlas-mcard-shelf__row">
            {workspace.relatedByArtist.map((related) => (
              <li key={related.rvtr}>
                <Link
                  href={atlasMissionHref(related.rvtr)}
                  className="atlas-mcard-mini"
                  prefetch
                >
                  <AtlasCoverArt
                    src={relatedCovers[related.rvtr] ?? null}
                    alt={`${related.artist} — ${related.title}`}
                    className="atlas-mcard-mini__art"
                  />
                  <span className="atlas-mcard-mini__title">{related.title}</span>
                  <span className="atlas-mcard-mini__meta">
                    {related.playCount} plays · {related.completenessPct}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="atlas-mcard-foot">
        <section className="atlas-mcard-impact" aria-labelledby="mcard-impact-heading">
          <h2 id="mcard-impact-heading" className="atlas-kicker">
            Territory impact
          </h2>
          <p className="atlas-mcard-impact__territory">{workspace.territory} Territory</p>
          <p className="atlas-mcard-impact__delta">
            {workspace.territoryMappedPct}% mapped → {workspace.territoryMappedAfterPct}% after
            this card
          </p>
          {albumsCampaign ? (
            <AtlasProgressBar
              pct={albumsCampaign.pct}
              label={`Albums campaign ${albumsCampaign.pct}%`}
              className="atlas-mcard-impact__bar"
            />
          ) : null}
        </section>

        <section className="atlas-mcard-discoveries" aria-labelledby="mcard-disc-heading">
          <h2 id="mcard-disc-heading" className="atlas-kicker">
            Recent discoveries
          </h2>
          <ul className="atlas-mcard-discoveries__list">
            {workspace.discoveries.map((item) => (
              <li key={item}>◆ {item}</li>
            ))}
          </ul>
        </section>
      </footer>

      <nav className="atlas-mcard-queue" aria-label="Mission queue">
        {workspace.prev ? (
          <Link
            href={atlasMissionHref(workspace.prev.rvtr)}
            className="atlas-mcard-queue__link"
            prefetch
          >
            <span className="atlas-mcard-queue__dir">← Previous</span>
            <span className="atlas-mcard-queue__track">
              {workspace.prev.title} · {workspace.prev.artist}
            </span>
          </Link>
        ) : (
          <span className="atlas-mcard-queue__spacer" />
        )}
        <p className="atlas-mcard-queue__points">
          {workspace.exhibitDepthPct}% exhibit · {workspace.pointsEarned} earned ·{" "}
          {workspace.pointsAvailable} available
        </p>
        {workspace.next ? (
          <Link
            href={atlasMissionHref(workspace.next.rvtr)}
            className="atlas-mcard-queue__link atlas-mcard-queue__link--next"
            prefetch
          >
            <span className="atlas-mcard-queue__dir">Next →</span>
            <span className="atlas-mcard-queue__track">
              {workspace.next.title} · {workspace.next.artist}
            </span>
          </Link>
        ) : (
          <span className="atlas-mcard-queue__spacer" />
        )}
      </nav>
    </div>
  );
}

function SlotHead({ gap }: { gap: MissionGap }) {
  return (
    <div className="atlas-mcard-slot__head">
      <span className="atlas-mcard-slot__mark" aria-hidden>
        ✗
      </span>
      <div>
        <p className="atlas-mcard-slot__label">{gap.label}</p>
        <p className="atlas-mcard-slot__desc">{gap.description}</p>
      </div>
      <span className="atlas-mcard-slot__pts">+{gap.points} pts</span>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`atlas-stat-pill${accent ? " atlas-stat-pill--accent" : ""}`}>
      <span className="atlas-stat-pill__label">{label}</span>
      <span className="atlas-stat-pill__value">{value}</span>
    </div>
  );
}

function slugStatus(status: string | null | undefined): string {
  return (status ?? "ready").toLowerCase().replace(/\s+/g, "-");
}
