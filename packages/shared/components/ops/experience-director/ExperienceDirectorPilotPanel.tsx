import Link from "next/link";

import type { DirectorPilotBundle, DirectorSongOutput } from "@/lib/ops/intelligence/ollama-experience-director/types";

function readinessClass(readiness: string): string {
  switch (readiness) {
    case "ready":
      return "exp-dir-pilot__badge--ready";
    case "needs_more_research":
      return "exp-dir-pilot__badge--review";
    default:
      return "exp-dir-pilot__badge--not-ready";
  }
}

function SongCard({ output, songMeta }: { output: DirectorSongOutput; songMeta?: { year: number | null; playCount: number; packageQualityTier: string } }) {
  const suspicious = output.qualityNotes.filter((n) =>
    /suspicious|wrong|unverified|doubt|flag/i.test(n),
  );

  return (
    <article className="exp-dir-pilot__card">
      <header className="exp-dir-pilot__card-head">
        <div>
          <h2 className="exp-dir-pilot__title">{output.title}</h2>
          <p className="exp-dir-pilot__artist">
            {output.artist}
            {songMeta?.year ? ` · ${songMeta.year}` : ""}
          </p>
        </div>
        <span className={`exp-dir-pilot__badge ${readinessClass(output.publicReadiness)}`}>
          {output.publicReadiness.replace(/_/g, " ")}
        </span>
      </header>

      <p className="exp-dir-pilot__rvtr">{output.rvtr}</p>

      {songMeta ? (
        <p className="exp-dir-pilot__meta">
          {songMeta.playCount} plays · package tier {songMeta.packageQualityTier}
        </p>
      ) : null}

      {output.bestAngle ? (
        <section className="exp-dir-pilot__section">
          <h3>Best angle</h3>
          <p>{output.bestAngle}</p>
        </section>
      ) : null}

      {output.heroNote ? (
        <section className="exp-dir-pilot__section">
          <h3>Hero note</h3>
          <p>{output.heroNote}</p>
        </section>
      ) : null}

      {output.chapters.length > 0 ? (
        <section className="exp-dir-pilot__section">
          <h3>Proposed chapters ({output.chapters.length})</h3>
          <ul className="exp-dir-pilot__list">
            {output.chapters.map((ch, i) => (
              <li key={i}>
                <strong>[{ch.type}] {ch.title}</strong>
                <span className="exp-dir-pilot__dim">{ch.whyIncluded}</span>
                <p className="exp-dir-pilot__body">{ch.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.omitReasons.length > 0 ? (
        <section className="exp-dir-pilot__section">
          <h3>Omitted content</h3>
          <ul className="exp-dir-pilot__list exp-dir-pilot__list--omit">
            {output.omitReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {suspicious.length > 0 ? (
        <section className="exp-dir-pilot__section exp-dir-pilot__section--warn">
          <h3>Suspicious facts flagged</h3>
          <ul className="exp-dir-pilot__list">
            {suspicious.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.missingData.length > 0 ? (
        <section className="exp-dir-pilot__section">
          <h3>Missing data</h3>
          <ul className="exp-dir-pilot__list">
            {output.missingData.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.recommendedNextResearch.length > 0 ? (
        <section className="exp-dir-pilot__section">
          <h3>Recommended next research</h3>
          <ul className="exp-dir-pilot__list">
            {output.recommendedNextResearch.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.discoveryShelves.length > 0 ? (
        <section className="exp-dir-pilot__section">
          <h3>Discovery shelves</h3>
          <ul className="exp-dir-pilot__list">
            {output.discoveryShelves.map((shelf, i) => (
              <li key={i}>
                <strong>{shelf.title}</strong> — {shelf.whyThisShelfMatters}
                {shelf.items.length > 0 ? (
                  <span className="exp-dir-pilot__dim"> ({shelf.items.join(", ")})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export function ExperienceDirectorPilotPanel({ bundle }: { bundle: DirectorPilotBundle }) {
  const ready = bundle.outputs.filter((o) => o.publicReadiness === "ready").length;
  const review = bundle.outputs.filter((o) => o.publicReadiness === "needs_more_research").length;
  const notReady = bundle.outputs.filter((o) => o.publicReadiness === "not_ready").length;

  return (
    <div className="exp-dir-pilot">
      <div className="exp-dir-pilot__summary">
        <div className="exp-dir-pilot__stat">
          <span className="exp-dir-pilot__stat-num">{bundle.selection.count}</span>
          <span className="exp-dir-pilot__stat-label">songs</span>
        </div>
        <div className="exp-dir-pilot__stat exp-dir-pilot__stat--ready">
          <span className="exp-dir-pilot__stat-num">{ready}</span>
          <span className="exp-dir-pilot__stat-label">ready</span>
        </div>
        <div className="exp-dir-pilot__stat exp-dir-pilot__stat--review">
          <span className="exp-dir-pilot__stat-num">{review}</span>
          <span className="exp-dir-pilot__stat-label">needs research</span>
        </div>
        <div className="exp-dir-pilot__stat exp-dir-pilot__stat--not-ready">
          <span className="exp-dir-pilot__stat-num">{notReady}</span>
          <span className="exp-dir-pilot__stat-label">not ready</span>
        </div>
      </div>

      <p className="exp-dir-pilot__lead">
        Ollama director outputs for pilot batch — selected {bundle.selection.selectedAt.slice(0, 10)}.
        Does not affect live Song Experience.
      </p>

      <div className="exp-dir-pilot__grid">
        {bundle.selection.songs.map((song) => {
          const output = bundle.outputs.find((o) => o.rvtr === song.rvtr);
          const result = bundle.results.find((r) => r.rvtr === song.rvtr);
          if (!output) {
            return (
              <article key={song.rvtr} className="exp-dir-pilot__card exp-dir-pilot__card--error">
                <h2>{song.title}</h2>
                <p>{song.artist} · {song.rvtr}</p>
                <p className="exp-dir-pilot__error">{result?.error ?? "No director output"}</p>
              </article>
            );
          }
          return (
            <SongCard
              key={song.rvtr}
              output={output}
              songMeta={{
                year: song.year,
                playCount: song.playCount,
                packageQualityTier: song.packageQualityTier,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ExperienceDirectorPilotEmpty() {
  return (
    <div className="exp-dir-pilot exp-dir-pilot--empty">
      <p>No pilot data yet.</p>
      <p className="exp-dir-pilot__dim">
        Run <code>npm run experience:director:pilot</code> to select 10 songs and generate director JSON.
      </p>
      <p>
        <Link href="/ops/intelligence" prefetch={false}>
          ← Research Center
        </Link>
      </p>
    </div>
  );
}
