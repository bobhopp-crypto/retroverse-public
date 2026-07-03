"use client";

import type { TrainingDepartmentSnapshot } from "@/lib/ops/studio/training/types";

import { TrainingReviewPanel } from "./TrainingReviewPanel";

type Props = {
  rvtr: string;
  snapshot: TrainingDepartmentSnapshot;
  onReviewSaved?: () => void;
};

export function TrainingDepartmentPanel({ rvtr, snapshot, onReviewSaved }: Props) {
  return (
    <div className="rs-training-dept">
      <section className="rs-training-dept__hero">
        <div className="rs-training-dept__meta">
          <p className="rs-training-dept__status">{snapshot.status.replace(/_/g, " ")}</p>
          <p className="rs-training-dept__confidence">
            Confidence: <strong>{snapshot.confidence}%</strong> ({snapshot.confidenceLabel})
          </p>
        </div>
        <p className="rs-training-dept__explain">{snapshot.explanation}</p>
      </section>

      <div className="rs-training-dept__grid">
        <section className="rs-training-dept__panel">
          <h2 className="rs-training-dept__panel-title">What came in?</h2>
          <p className="rs-training-dept__summary">{snapshot.input.summary}</p>
          <ul className="rs-training-dept__list">
            {snapshot.input.items.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </section>

        <section className="rs-training-dept__panel">
          <h2 className="rs-training-dept__panel-title">What went out?</h2>
          <p className="rs-training-dept__summary">{snapshot.output.summary}</p>
          <ul className="rs-training-dept__list">
            {snapshot.output.items.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rs-training-dept__panel rs-training-dept__panel--decisions">
        <h2 className="rs-training-dept__panel-title">Why?</h2>
        <dl className="rs-training-dept__decisions">
          {snapshot.decisions.map((d) => (
            <div key={d.id}>
              <dt>{d.label}</dt>
              <dd>{d.reason}</dd>
            </div>
          ))}
          {snapshot.decisions.length === 0 ? (
            <p className="rs-training-dept__empty">No decisions recorded yet.</p>
          ) : null}
        </dl>
      </section>

      <TrainingReviewPanel
        rvtr={rvtr}
        department={snapshot.department}
        snapshot={snapshot}
        onSaved={onReviewSaved}
      />
    </div>
  );
}
