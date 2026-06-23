import Link from "next/link";

import type { VideoBackfillCoverage } from "@/lib/ops/intelligence/backfill-coverage";
import type {
  TopPlayedBackfillData,
  TopPlayedCohortStats,
  TopPlayedTrack,
} from "@/lib/ops/intelligence/top-played-backfill";
import type { CoverRecoveryQueueFile } from "@/lib/ops/intelligence/cover-recovery-queue";

type Props = {
  coverage: VideoBackfillCoverage;
  topPlayed: TopPlayedBackfillData;
  coverRecovery: CoverRecoveryQueueFile;
};

function StatusCell({ ok }: { ok: boolean }) {
  return (
    <span className={ok ? "intel-backfill__status--ok" : "intel-backfill__status--miss"}>
      {ok ? "✓" : "✗"}
    </span>
  );
}

function CohortSummary({ label, stats }: { label: string; stats: TopPlayedCohortStats }) {
  return (
    <div className="intel-backfill__cohort-card">
      <p className="intel-backfill__cohort-label">{label}</p>
      <div className="intel-backfill__cohort-metrics">
        <div>
          <p className="intel-backfill__cohort-value">{stats.coverPct}%</p>
          <p className="intel-backfill__cohort-hint">Cover</p>
        </div>
        <div>
          <p className="intel-backfill__cohort-value">{stats.packagePct}%</p>
          <p className="intel-backfill__cohort-hint">Package</p>
        </div>
        <div>
          <p className="intel-backfill__cohort-value">{stats.artifactPct}%</p>
          <p className="intel-backfill__cohort-hint">Artifacts</p>
        </div>
        <div>
          <p className="intel-backfill__cohort-value">{stats.readyPct}%</p>
          <p className="intel-backfill__cohort-hint">Ready</p>
        </div>
      </div>
      <p className="intel-backfill__cohort-meta">
        {stats.missingCovers} covers · {stats.missingPackages} packages · {stats.missingArtifacts}{" "}
        artifacts remaining
      </p>
    </div>
  );
}

function TrackTable({ tracks, limit }: { tracks: TopPlayedTrack[]; limit: number }) {
  const rows = tracks.slice(0, limit);
  return (
    <div className="intel-backfill__table-wrap">
      <table className="intel-backfill__table">
        <thead>
          <tr>
            <th>Plays</th>
            <th>Song</th>
            <th>Cover</th>
            <th>Package</th>
            <th>Artifacts</th>
            <th>Conf</th>
            <th>Runtime</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={`${t.rvtr ?? t.filePath}-${t.playCount}`}>
              <td>{t.playCount.toLocaleString()}</td>
              <td>
                {t.rvtr ? (
                  <Link href={`/ops/intelligence/package/${t.rvtr}`} className="intel-backfill__table-link">
                    <span className="intel-backfill__table-title">{t.title}</span>
                    <span className="intel-backfill__table-artist">{t.artist}</span>
                  </Link>
                ) : (
                  <>
                    <span className="intel-backfill__table-title">{t.title}</span>
                    <span className="intel-backfill__table-artist">{t.artist}</span>
                  </>
                )}
              </td>
              <td>
                <StatusCell ok={t.hasCover} />
              </td>
              <td>
                <StatusCell ok={t.hasPackage} />
              </td>
              <td>
                <StatusCell ok={t.artifactsReady} />
              </td>
              <td>{t.hasPackage ? `${t.confidence}%` : "—"}</td>
              <td>{t.runtimeMs ? `${Math.round(t.runtimeMs / 1000)}s` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IntelligenceBackfillDashboard({ coverage, topPlayed, coverRecovery }: Props) {
  return (
    <div className="intel-backfill">
      <header className="intel-backfill__hero">
        <p className="intel-backfill__kicker">Top Played · VIDEO / Only</p>
        <h1 className="intel-backfill__title">Song Package Backfill</h1>
        <p className="intel-backfill__lead">
          Top 100 cover {topPlayed.top100.coverPct}% · package {topPlayed.top100.packagePct}% · artifacts{" "}
          {topPlayed.top100.artifactPct}%
        </p>
        <p className="intel-backfill__meta">
          Bottleneck: <strong>covers</strong> · {topPlayed.workRemaining.covers} missing in Top 100 · est.{" "}
          {topPlayed.projectedTop100Minutes} min to complete cohort
        </p>
      </header>

      <section className="intel-backfill__top-played" aria-label="Top played cohorts">
        <h2 className="intel-backfill__section-title">Top Played Completion</h2>
        <p className="intel-backfill__funnel-lead">
          Goal: 100% cover · package · artifacts on Top 100 before library-scale backfill
        </p>
        <div className="intel-backfill__cohort-grid">
          <CohortSummary label="Top 25" stats={topPlayed.top25} />
          <CohortSummary label="Top 50" stats={topPlayed.top50} />
          <CohortSummary label="Top 100" stats={topPlayed.top100} />
        </div>
      </section>

      <section className="intel-backfill__linkage intel-backfill__recovery">
        <h2 className="intel-backfill__section-title">Cover Recovery Queue</h2>
        <p className="intel-backfill__linkage-lead">
          Automated recovery: Retroverse library → artwork links → cache → iTunes → MusicBrainz → Discogs
        </p>
        <div className="intel-backfill__linkage-grid">
          <div className="intel-backfill__linkage-stat">
            <p className="intel-backfill__linkage-value">{coverRecovery.summary.recovered}</p>
            <p className="intel-backfill__linkage-label">Recovered</p>
          </div>
          <div className="intel-backfill__linkage-stat">
            <p className="intel-backfill__linkage-value">{coverRecovery.summary.reviewNeeded}</p>
            <p className="intel-backfill__linkage-label">Review Needed</p>
          </div>
          <div className="intel-backfill__linkage-stat">
            <p className="intel-backfill__linkage-value">{coverRecovery.summary.failed}</p>
            <p className="intel-backfill__linkage-label">Failed</p>
          </div>
        </div>
        {coverRecovery.summary.total === 0 && (
          <p className="intel-backfill__actions-lead">Run `npm run intelligence:cover-recovery` to process missing covers.</p>
        )}
      </section>

      <section>
        <h2 className="intel-backfill__section-title">Cover Completion Queue</h2>
        <p className="intel-backfill__queue-scope">
          Top 100 most-played · missing cover · {topPlayed.coverCompletionQueue.length} tracks
        </p>
        {topPlayed.coverCompletionQueue.length === 0 ? (
          <p className="intel-backfill__actions-lead">Top 100 cover coverage complete.</p>
        ) : (
          <ul className="intel-backfill__list">
            {topPlayed.coverCompletionQueue.slice(0, 12).map((t) => (
              <li key={t.filePath} className="intel-backfill__list-item">
                <div className="intel-backfill__list-row">
                  {t.rvtr ? (
                    <Link href={`/ops/intelligence/package/${t.rvtr}`} className="intel-backfill__list-link">
                      <span className="intel-backfill__list-title">{t.title}</span>
                      <span className="intel-backfill__list-artist">{t.artist}</span>
                    </Link>
                  ) : (
                    <div className="intel-backfill__list-link">
                      <span className="intel-backfill__list-title">{t.title}</span>
                      <span className="intel-backfill__list-artist">{t.artist}</span>
                    </div>
                  )}
                  <span className="intel-backfill__list-plays">{t.playCount.toLocaleString()} plays</span>
                </div>
                <p className="intel-backfill__list-meta">Cover: missing · assign via Cover Library</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="intel-backfill__section-title">Top 25</h2>
        <TrackTable tracks={topPlayed.tracks} limit={25} />
      </section>

      <section>
        <h2 className="intel-backfill__section-title">Top 50</h2>
        <TrackTable tracks={topPlayed.tracks} limit={50} />
      </section>

      <section>
        <h2 className="intel-backfill__section-title">Top 100</h2>
        <TrackTable tracks={topPlayed.tracks} limit={100} />
      </section>

      <section className="intel-backfill__queues">
        <h2 className="intel-backfill__section-title">Package Queue</h2>
        <p className="intel-backfill__queue-scope">Play count DESC · cover required · Top 100 cohort</p>
        <div className="intel-backfill__queue-grid">
          <div className="intel-backfill__queue-card intel-backfill__queue-card--cover">
            <p className="intel-backfill__queue-value">{topPlayed.workRemaining.covers}</p>
            <p className="intel-backfill__queue-label">Covers Needed</p>
            <p className="intel-backfill__queue-hint">Top 100 · blocking packages</p>
          </div>
          <div className="intel-backfill__queue-card">
            <p className="intel-backfill__queue-value">{topPlayed.workRemaining.packages}</p>
            <p className="intel-backfill__queue-label">Packages Needed</p>
            <p className="intel-backfill__queue-hint">Has cover · no package</p>
          </div>
          <div className="intel-backfill__queue-card">
            <p className="intel-backfill__queue-value">{topPlayed.workRemaining.artifacts}</p>
            <p className="intel-backfill__queue-label">Artifacts Needed</p>
            <p className="intel-backfill__queue-hint">Package exists · incomplete</p>
          </div>
        </div>
      </section>

      <section className="intel-backfill__actions">
        <h2 className="intel-backfill__section-title">Run Batch</h2>
        <pre className="intel-backfill__commands">{`npm run intelligence:cover-recovery
npm run intelligence:top100-report
npm run intelligence:top100-validation
npm run intelligence:top25
npm run intelligence:top100
npm run intelligence:next10`}</pre>
        <p className="intel-backfill__actions-lead">
          Library: {coverage.videosInLibrary.toLocaleString()} videos · {coverage.identification.totalIdentifiable.toLocaleString()}{" "}
          identifiable ({coverage.linkedPct}%)
        </p>
      </section>
    </div>
  );
}
