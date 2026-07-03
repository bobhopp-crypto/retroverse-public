import Image from "next/image";
import Link from "next/link";

import type { PackageViewModel } from "@/lib/ops/intelligence/package-view-model";
import {
  excerptPreview,
  formatStatus,
  sourceLabel,
  vaultSourceName,
} from "@/lib/ops/intelligence/package-view-model";
import type { CandidateFact, ResearchVaultEntry } from "@/lib/ops/intelligence/song-package-types";
import type { PackageDiagnostics } from "@/lib/ops/intelligence/package-diagnostics";
import { resolveHeroFromSongPackage } from "@/lib/visual-profile/hero-resolver";

import { IntelligencePackageMaintenance } from "./IntelligencePackageMaintenance";
import { IntelligenceReviewClient } from "./IntelligenceReviewClient";

type Props = {
  view: PackageViewModel;
  diagnostics: PackageDiagnostics;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="intel-stat">
      <p className="intel-stat__value">{value}</p>
      <p className="intel-stat__label">{label}</p>
    </div>
  );
}

function FactRow({ fact }: { fact: CandidateFact }) {
  return (
    <li className="intel-fact-row">
      <p className="intel-fact-row__text">{fact.factText}</p>
      <p className="intel-fact-row__meta">
        {sourceLabel(fact)} · confidence {Math.round(fact.confidence * 100)}% · importance{" "}
        {Math.round(fact.importance * 100)}%
      </p>
    </li>
  );
}

function SourceCard({ entry }: { entry: ResearchVaultEntry }) {
  return (
    <article className="intel-source-card">
      <div className="intel-source-card__head">
        <h3 className="intel-source-card__name">{vaultSourceName(entry)}</h3>
        <p className="intel-source-card__conf">{Math.round(entry.confidence * 100)}% confidence</p>
      </div>
      {entry.url ? (
        <a className="intel-source-card__url" href={entry.url} target="_blank" rel="noreferrer">
          {entry.url}
        </a>
      ) : (
        <p className="intel-source-card__url">Local canonical source</p>
      )}
      <p className="intel-source-card__date">Captured {formatDate(entry.capturedAt)}</p>
      <p className="intel-source-card__excerpt">{excerptPreview(entry.excerpt, 280)}</p>
    </article>
  );
}

export function IntelligencePackageViewer({ view, diagnostics }: Props) {
  const { pkg, stats, health, artifacts, factGroups, stories, relationships } = view;
  const meta = pkg.metadata;
  const hero = resolveHeroFromSongPackage(pkg);

  const factGroupEntries = (
    Object.entries(factGroups) as Array<[keyof typeof factGroups, CandidateFact[]]>
  ).filter(([, facts]) => facts.length > 0);

  return (
    <div className="intel-package">
      <Link className="intel-review__back" href="/ops/intelligence" prefetch={false}>
        ← Research Center
      </Link>

      <header className="intel-package-hero">
        {hero.url ? (
          <Image
            src={hero.url}
            alt=""
            width={160}
            height={160}
            className="intel-package-hero__cover"
            unoptimized
          />
        ) : (
          <div className="intel-package-hero__cover intel-package-hero__cover--empty" aria-hidden />
        )}
        <div className="intel-package-hero__body">
          <p className="intel-package-hero__kicker">Song Research</p>
          <h1 className="intel-package-hero__title">{meta.title}</h1>
          <p className="intel-package-hero__artist">{meta.artist}</p>
          <p className="intel-package-hero__rvtr">{pkg.rvtr}</p>
          <p className="intel-package-hero__meta">
            {meta.year ?? "—"} · {pkg.rvtr} · {formatStatus(pkg.status)}
          </p>
          <p className="intel-package-hero__processed">
            Last processed {formatDate(pkg.processedAt ?? pkg.updatedAt)}
          </p>
        </div>
      </header>

      <section className="intel-stat-grid" aria-label="Research statistics">
        <StatCard label="Sources" value={stats.sources} />
        <StatCard label="Facts" value={stats.facts} />
        <StatCard label="Stories" value={stats.stories} />
        <StatCard label="Quotes" value={stats.quotes} />
        <StatCard label="Related Songs" value={stats.relatedSongs} />
        <StatCard label="Related Artists" value={stats.relatedArtists} />
        <StatCard label="Assets" value={stats.assets} />
      </section>

      <IntelligencePackageMaintenance rvtr={pkg.rvtr} diagnostics={diagnostics} />

      <section className="intel-package-section intel-package-section--review">
        <h2 id="package-review" className="intel-package-section__title">Research Review</h2>
        <p className="intel-package-section__lead">
          Approve facts and stories, build experience content, and approve research from this detail page.
        </p>
        <IntelligenceReviewClient rvtr={pkg.rvtr} />
      </section>

      <section className="intel-package-section">
        <h2 className="intel-package-section__title">Sources</h2>
        <p className="intel-package-section__lead">Background research collected for this song.</p>
        {pkg.researchVault.length === 0 ? (
          <p className="intel-dim">No sources captured yet.</p>
        ) : (
          <div className="intel-source-grid">
            {pkg.researchVault.map((entry) => (
              <SourceCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section className="intel-package-section">
        <h2 className="intel-package-section__title">Facts</h2>
        <p className="intel-package-section__lead">Verified discoveries grouped by topic.</p>
        {factGroupEntries.length === 0 ? (
          <p className="intel-dim">No facts extracted yet.</p>
        ) : (
          factGroupEntries.map(([group, facts]) => (
            <div key={group} className="intel-fact-group">
              <h3 className="intel-fact-group__title">{group}</h3>
              <ul className="intel-fact-group__list">
                {facts.map((fact) => (
                  <FactRow key={fact.id} fact={fact} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="intel-package-section">
        <h2 className="intel-package-section__title">Story</h2>
        <p className="intel-package-section__lead">The stories worth telling about this song.</p>
        {stories.length === 0 ? (
          <p className="intel-dim">No stories discovered yet.</p>
        ) : (
          <ul className="intel-story-grid">
            {stories.map((story) => (
              <li key={story.id} className="intel-story-card">
                <p className="intel-story-card__rank">#{story.rank}</p>
                <h3 className="intel-story-card__title">{story.headline}</h3>
                <p className="intel-story-card__type">{story.hookType}</p>
                <ul className="intel-story-card__facts">
                  {story.supportingFacts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
                <p className="intel-story-card__conf">
                  Confidence {Math.round(story.confidence * 100)}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="intel-package-section">
        <h2 className="intel-package-section__title">Relationship Map</h2>
        <div className="intel-rel-map">
          <div className="intel-rel-card intel-rel-card--primary">
            <p className="intel-rel-card__label">Song</p>
            <p className="intel-rel-card__value">{relationships.song.title}</p>
            <p className="intel-rel-card__sub">{relationships.song.rvtr}</p>
          </div>
          <p className="intel-rel-arrow" aria-hidden>
            →
          </p>
          <div className="intel-rel-card">
            <p className="intel-rel-card__label">Album</p>
            <p className="intel-rel-card__value">
              {relationships.album?.title ?? "Unknown album"}
            </p>
            {relationships.album?.year ? (
              <p className="intel-rel-card__sub">{relationships.album.year}</p>
            ) : null}
          </div>
          <p className="intel-rel-arrow" aria-hidden>
            →
          </p>
          <div className="intel-rel-card">
            <p className="intel-rel-card__label">Artist</p>
            <p className="intel-rel-card__value">{relationships.artist.name}</p>
          </div>
        </div>
        <div className="intel-rel-columns">
          <div>
            <h3 className="intel-rel-columns__title">Related Songs</h3>
            {relationships.relatedSongs.length === 0 ? (
              <p className="intel-dim">No album siblings loaded.</p>
            ) : (
              <ul className="intel-rel-list">
                {relationships.relatedSongs.map((song) => (
                  <li key={song.rvtr}>
                    <Link href={`/ops/intelligence/package/${song.rvtr}`} prefetch={false}>
                      {song.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="intel-rel-columns__title">Related Artists</h3>
            <ul className="intel-rel-list">
              {relationships.relatedArtists.map((artist) => (
                <li key={artist.name}>{artist.name}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="intel-package-section intel-package-section--artifacts">
        <h2 className="intel-package-section__title">Artifacts</h2>
        <p className="intel-package-section__lead">
          Visual outputs rendered from this research — record labels, timelines, story maps, and song DNA.
        </p>
        <div className="intel-generate-row">
          <Link
            className="intel-btn intel-btn--primary"
            href={`/ops/intelligence/package/${pkg.rvtr}/artifacts`}
            prefetch={false}
          >
            Open Artifact Studio →
          </Link>
          <div className="intel-generate-previews">
            {artifacts.slice(0, 4).map((a) => (
              <span
                key={a.id}
                className={`intel-generate-chip${a.ready ? " intel-generate-chip--ready" : ""}`}
              >
                {a.label}: {a.ready ? "READY" : "NOT READY"}
              </span>
            ))}
          </div>
        </div>
        {pkg.intel ? (
          <div className="intel-intel-grid intel-intel-grid--compact">
            <div className="intel-intel-field">
              <p className="intel-intel-field__label">Label</p>
              <p className="intel-intel-field__value">{pkg.intel.label ?? "—"}</p>
            </div>
            <div className="intel-intel-field">
              <p className="intel-intel-field__label">Catalog #</p>
              <p className="intel-intel-field__value">{pkg.intel.catalogNumber ?? "—"}</p>
            </div>
            <div className="intel-intel-field">
              <p className="intel-intel-field__label">Timeline</p>
              <p className="intel-intel-field__value">{pkg.intel.timelineEvents.length} events</p>
            </div>
            <div className="intel-intel-field">
              <p className="intel-intel-field__label">Recording / Video</p>
              <p className="intel-intel-field__value">
                {pkg.intel.recordingFacts.length} / {pkg.intel.videoFacts.length}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="intel-package-section">
        <h2 className="intel-package-section__title">Artifact Readiness</h2>
        <p className="intel-package-section__lead">Possible outputs from this research.</p>
        <ul className="intel-artifact-grid">
          {artifacts.map((artifact) => (
            <li
              key={artifact.id}
              className={`intel-artifact${artifact.ready ? " intel-artifact--ready" : ""}`}
            >
              <p className="intel-artifact__status">{artifact.ready ? "READY" : "NOT READY"}</p>
              <p className="intel-artifact__label">{artifact.label}</p>
              <p className="intel-artifact__note">{artifact.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="intel-package-section">
        <h2 className="intel-package-section__title">Coverage</h2>
        <div className="intel-health-grid">
          <div className="intel-health">
            <p className="intel-health__value">{health.sourceCoverage}%</p>
            <p className="intel-health__label">Source Coverage</p>
          </div>
          <div className="intel-health">
            <p className="intel-health__value">{health.factCoverage}%</p>
            <p className="intel-health__label">Fact Coverage</p>
          </div>
          <div className="intel-health">
            <p className="intel-health__value">{health.storyCoverage}%</p>
            <p className="intel-health__label">Story Coverage</p>
          </div>
          <div className="intel-health intel-health--accent">
            <p className="intel-health__value">{health.confidence}%</p>
            <p className="intel-health__label">Confidence</p>
          </div>
        </div>
      </section>
    </div>
  );
}
