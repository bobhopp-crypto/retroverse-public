import Link from "next/link";

import { directorWorkspacePath } from "@/lib/ops/studio/director/workspace/paths";
import { productionTrackerPath } from "@/lib/ops/studio/production-tracker/paths";
import type { CreativeReviewSnapshot } from "@/lib/ops/studio/creative-review/types";

type Props = {
  snapshot: CreativeReviewSnapshot;
};

function gateClass(gate: string): string {
  return `rs-cr__gate rs-cr__gate--${gate.replace(/_/g, "-")}`;
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="rs-cr__score-bar">
      <div className="rs-cr__score-bar-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="rs-cr__score-track" aria-hidden>
        <span className="rs-cr__score-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function CreativeReviewView({ snapshot }: Props) {
  const { executiveSummary: exec, storyFlow, pacing, variety, repetition, narrative, audience, publishGate, directorFeedback } = snapshot;

  return (
    <div className="rs-cr">
      <header className="rs-cr__hero">
        <Link href="/ops/studio" className="rs-cr__back">
          ← Mission Control
        </Link>
        <p className="rs-cr__kicker">Creative Review Department</p>
        <p className="rs-cr__mission">Would a real person enjoy experiencing this?</p>
        <div className="rs-cr__song">
          {snapshot.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snapshot.coverUrl} alt="" className="rs-cr__art" />
          ) : (
            <div className="rs-cr__art rs-cr__art--fallback" aria-hidden>
              {snapshot.title.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="rs-cr__title">{snapshot.title}</h1>
            <p className="rs-cr__artist">{snapshot.artist}</p>
            <p className="rs-cr__rvtr">{snapshot.rvtr}</p>
          </div>
        </div>
        <div className="rs-cr__links">
          <Link href={directorWorkspacePath(snapshot.rvtr)} className="rs-cr__link">
            Director Workspace
          </Link>
          <Link href={productionTrackerPath(snapshot.rvtr)} className="rs-cr__link">
            Follow This Song
          </Link>
        </div>
      </header>

      <section className="rs-cr__section rs-cr__section--executive" aria-labelledby="cr-executive">
        <div className="rs-cr__section-head">
          <h2 id="cr-executive">Executive Summary</h2>
          <span className={gateClass(exec.publishReadiness)}>{exec.publishReadinessLabel}</span>
        </div>
        <p className="rs-cr__overall-score">{exec.overallScore}%</p>
        <p className="rs-cr__narrative">{exec.narrativeParagraph}</p>
        <div className="rs-cr__columns">
          <div>
            <h3>Strengths</h3>
            <ul>{exec.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <h3>Weaknesses</h3>
            <ul>{exec.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <h3>Recommended fixes</h3>
            <ul>{exec.recommendedFixes.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="rs-cr__section" aria-labelledby="cr-flow">
        <div className="rs-cr__section-head">
          <h2 id="cr-flow">Story Flow Review</h2>
          <p>Flow score {storyFlow.flowScore}% · Avg interest {storyFlow.averageInterest}% · Avg visual {storyFlow.averageVisual}%</p>
        </div>
        <ol className="rs-cr__flow-list">
          {storyFlow.beats.map((beat, index) => (
            <li key={beat.beatId} className="rs-cr__flow-beat">
              <div className="rs-cr__flow-beat-head">
                <span className="rs-cr__flow-num">{beat.order}</span>
                <div>
                  <strong>{beat.label}</strong>
                  <p>{beat.purpose}</p>
                </div>
              </div>
              <dl className="rs-cr__beat-scores">
                <div><dt>Interest</dt><dd>{beat.interestScore}</dd></div>
                <div><dt>Visual</dt><dd>{beat.visualScore}</dd></div>
                <div><dt>Density</dt><dd>{beat.informationDensity}</dd></div>
                <div><dt>Attention</dt><dd>{beat.audienceAttention}</dd></div>
                <div><dt>Transition</dt><dd>{beat.transitionQuality}</dd></div>
              </dl>
              {index < storyFlow.beats.length - 1 ? (
                <span className="rs-cr__flow-arrow" aria-hidden>↓</span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rs-cr__section" aria-labelledby="cr-pacing">
        <div className="rs-cr__section-head">
          <h2 id="cr-pacing">Pacing Review</h2>
          <p>Score {pacing.score}%</p>
        </div>
        <dl className="rs-cr__stat-grid">
          <div><dt>Text-heavy beats</dt><dd>{pacing.textHeavyBeats}</dd></div>
          <div><dt>Image-heavy beats</dt><dd>{pacing.imageHeavyBeats}</dd></div>
          <div><dt>Longest text run</dt><dd>{pacing.longestTextRun}</dd></div>
          <div><dt>Longest media gap</dt><dd>{pacing.longestMediaGap}</dd></div>
        </dl>
        {pacing.issues.length > 0 ? (
          <ul className="rs-cr__issues">
            {pacing.issues.map((issue) => (
              <li key={issue.kind}>
                <strong>{issue.message}</strong>
                <span>{issue.recommendation}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rs-cr__empty">Pacing passes editorial checks.</p>
        )}
      </section>

      <section className="rs-cr__section" aria-labelledby="cr-variety">
        <div className="rs-cr__section-head">
          <h2 id="cr-variety">Variety Review</h2>
          <p>Diversity score {variety.diversityScore}%</p>
        </div>
        <ul className="rs-cr__variety-slots">
          {variety.slots.map((slot) => (
            <li key={slot.id} className={slot.present ? "rs-cr__slot rs-cr__slot--yes" : "rs-cr__slot rs-cr__slot--no"}>
              {slot.label} · {slot.count}
            </li>
          ))}
        </ul>
        {variety.recommendations.length > 0 ? (
          <ul className="rs-cr__recs">{variety.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
        ) : null}
      </section>

      <section className="rs-cr__section" aria-labelledby="cr-repetition">
        <div className="rs-cr__section-head">
          <h2 id="cr-repetition">Repetition Review</h2>
          <p>Score {repetition.score}%</p>
        </div>
        {repetition.items.length > 0 ? (
          <ul className="rs-cr__rep-list">
            {repetition.items.map((item, i) => (
              <li key={`${item.kind}-${i}`}>
                <strong>{item.message}</strong>
                <span>Beats: {item.beatLabels.join(", ")}</span>
                <span>{item.recommendation}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rs-cr__empty">No harmful repetition detected.</p>
        )}
      </section>

      <section className="rs-cr__section" aria-labelledby="cr-narrative">
        <div className="rs-cr__section-head">
          <h2 id="cr-narrative">Narrative Review</h2>
          <p>Arc score {narrative.arcScore}%</p>
        </div>
        <ul className="rs-cr__arc-phases">
          {narrative.phases.map((phase) => (
            <li key={phase.phase} className={phase.present ? "rs-cr__arc rs-cr__arc--yes" : "rs-cr__arc rs-cr__arc--no"}>
              <strong>{phase.label}</strong>
              <span>{phase.present ? `${phase.strength}%` : "Missing"}</span>
              {phase.beatLabel ? <span className="rs-cr__arc-beat">{phase.beatLabel}</span> : null}
              {phase.recommendation ? <p>{phase.recommendation}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rs-cr__section" aria-labelledby="cr-audience">
        <div className="rs-cr__section-head">
          <h2 id="cr-audience">Audience Review</h2>
          <p>Average engagement {audience.averageEngagement}%</p>
        </div>
        <div className="rs-cr__persona-grid">
          {audience.personas.map((p) => (
            <article key={p.persona} className="rs-cr__persona">
              <h3>{p.persona}</h3>
              <p className="rs-cr__persona-overall">{p.overall}% overall</p>
              <ScoreBar value={p.interesting} label="Interesting" />
              <ScoreBar value={p.educational} label="Educational" />
              <ScoreBar value={p.emotional} label="Emotional" />
              <ScoreBar value={p.entertaining} label="Entertaining" />
              <ScoreBar value={p.replayValue} label="Replay" />
            </article>
          ))}
        </div>
      </section>

      <section className="rs-cr__section" aria-labelledby="cr-missing">
        <div className="rs-cr__section-head">
          <h2 id="cr-missing">Missing Opportunities</h2>
          <p>Recommendations only — Creative Review does not generate content</p>
        </div>
        {snapshot.missingOpportunities.length > 0 ? (
          <ul className="rs-cr__missing">
            {snapshot.missingOpportunities.map((op) => (
              <li key={op.id}>
                <strong>{op.label}</strong>
                <span>{op.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rs-cr__empty">No obvious missed opportunities.</p>
        )}
      </section>

      <section className="rs-cr__section rs-cr__section--gate" aria-labelledby="cr-gate">
        <div className="rs-cr__section-head">
          <h2 id="cr-gate">Publish Gate</h2>
          <span className={gateClass(publishGate.decision)}>{publishGate.label}</span>
        </div>
        <ul className="rs-cr__gate-reasons">
          {publishGate.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
        {publishGate.blockers.length > 0 ? (
          <ul className="rs-cr__blockers">
            {publishGate.blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        ) : null}
      </section>

      <section className="rs-cr__section rs-cr__section--feedback" aria-labelledby="cr-feedback">
        <div className="rs-cr__section-head">
          <h2 id="cr-feedback">Director Feedback</h2>
          <p>Editorial notes for the Director — Creative Review never edits the plan</p>
        </div>
        <ul className="rs-cr__feedback">
          {directorFeedback.map((note) => (
            <li key={note.id} className={`rs-cr__note rs-cr__note--${note.priority}`}>
              <span className="rs-cr__note-priority">{note.priority}</span>
              <p>{note.message}</p>
              {note.beatRefs.length > 0 ? (
                <span className="rs-cr__note-refs">Beats: {note.beatRefs.join(" · ")}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
