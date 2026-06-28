import Link from "next/link";

import type { ExperiencePatternsSnapshot } from "@/lib/ops/studio/publisher/experience/types";
import type { ExperienceDriftReport } from "@/lib/ops/studio/publisher/experience/types";

type Props = {
  patterns: ExperiencePatternsSnapshot;
  drift: ExperienceDriftReport | null;
};

export function ExperienceLabDashboard({ patterns, drift }: Props) {
  return (
    <div className="rs-exp-lab">
      <header className="rs-exp-lab__head">
        <h1 className="rs-exp-lab__title">Quality Laboratory</h1>
        <p className="rs-exp-lab__lead">
          Every approval is evidence. Every rejection is training. Discover what makes experiences unforgettable.
        </p>
        <p className="rs-exp-lab__nav">
          <Link href="/ops/studio/publisher">← Publisher board</Link>
          {" · "}
          <Link href="/ops/studio/publisher/museum">Museum Wall →</Link>
        </p>
      </header>

      {drift && !drift.passed ? (
        <section className="rs-exp-lab__drift rs-exp-lab__drift--fail">
          <h2>Experience Drift Alert</h2>
          <p>{drift.message}</p>
        </section>
      ) : null}

      <div className="rs-exp-lab__stats">
        <article><strong>{patterns.packageCount}</strong><span>Packages evaluated</span></article>
        <article><strong>{patterns.approvedCount}</strong><span>Approved</span></article>
        <article><strong>{patterns.goldenCount}</strong><span>Golden exemplars</span></article>
        <article><strong>{patterns.avgUniquenessScore}%</strong><span>Avg uniqueness</span></article>
      </div>

      <section className="rs-exp-lab__section">
        <h2>Fingerprint performance</h2>
        <ul className="rs-exp-lab__fp-list">
          {patterns.fingerprintScores
            .filter((row) => row.count > 0)
            .map((row) => (
              <li key={row.id}>
                <strong>{row.fingerprint}</strong>
                <span>{row.count} packages</span>
                <span>{row.avgEmotionScore}% avg emotion</span>
                <span>{row.showcaseRate}% showcase rate</span>
              </li>
            ))}
        </ul>
      </section>

      {patterns.topOpenings.length > 0 ? (
        <section className="rs-exp-lab__section">
          <h2>Opening patterns</h2>
          <ul className="rs-exp-lab__openings">
            {patterns.topOpenings.map((row) => (
              <li key={row.id}>
                <strong>{row.exhibitPattern.replace(/_/g, " ")}</strong>
                <span>{row.count}× · {row.avgScore}% avg</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {patterns.topRejections.length > 0 ? (
        <section className="rs-exp-lab__section">
          <h2>Rejection patterns</h2>
          <ul className="rs-exp-lab__rejections">
            {patterns.topRejections.map((row) => (
              <li key={row.id}>
                <span>{row.reason}</span>
                <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {patterns.showcaseFingerprints.length > 0 ? (
        <section className="rs-exp-lab__section">
          <h2>Natural Showcase fingerprints</h2>
          <p>{patterns.showcaseFingerprints.join(" · ")}</p>
        </section>
      ) : null}
    </div>
  );
}
