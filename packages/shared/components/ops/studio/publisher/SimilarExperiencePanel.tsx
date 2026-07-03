"use client";

import Link from "next/link";

import type { SimilarExperienceMatch } from "@/lib/ops/studio/publisher/experience/types";

type Props = {
  matches: SimilarExperienceMatch[];
  uniquenessScore: number;
};

export function SimilarExperiencePanel({ matches, uniquenessScore }: Props) {
  if (matches.length === 0) {
    return (
      <section className="rs-exp-similar">
        <h2 className="rs-exp-similar__title">Distinctiveness</h2>
        <p className="rs-exp-similar__unique">{uniquenessScore}% unique — no close matches yet.</p>
      </section>
    );
  }

  return (
    <section className="rs-exp-similar rs-exp-similar--warn">
      <h2 className="rs-exp-similar__title">Feels almost identical to…</h2>
      <p className="rs-exp-similar__unique">Uniqueness score: {uniquenessScore}%</p>
      <ul className="rs-exp-similar__list">
        {matches.map((match) => (
          <li key={match.rvtr}>
            <Link href={`/ops/studio/publisher/${match.rvtr}`}>
              {match.title} · {match.artist}
            </Link>
            <span>{match.similarity}% similar</span>
            {match.sharedFingerprints.length > 0 ? (
              <em>{match.sharedFingerprints.join(", ")}</em>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
