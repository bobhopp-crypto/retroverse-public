"use client";

import { useEffect, useState } from "react";

import {
  LAB_LAYOUTS,
  RATING_METRICS,
  type LabLayoutId,
  type LabRatingsStore,
  type RatingMetricId,
} from "@/lib/retroverse/experience-lab/types";
import { loadLabRatings, saveLabRatings } from "@/lib/retroverse/experience-lab/ratings-storage";

type Props = {
  rvtr: string;
  activeLayout: LabLayoutId;
};

export function EvaluationPanel({ rvtr, activeLayout }: Props) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<LabRatingsStore>({});

  useEffect(() => {
    setRatings(loadLabRatings(rvtr));
  }, [rvtr]);

  function setRating(metric: RatingMetricId, value: number) {
    setRatings((prev) => {
      const next: LabRatingsStore = {
        ...prev,
        [activeLayout]: {
          ...(prev[activeLayout] ?? {}),
          [metric]: value,
        },
      };
      saveLabRatings(rvtr, next);
      return next;
    });
  }

  const current = ratings[activeLayout] ?? {};

  return (
    <section className="elab-eval">
      <button type="button" className="elab-eval__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide evaluation" : "Rate this layout"}
      </button>
      {open ? (
        <div className="elab-eval__panel">
          <p className="elab-eval__hint">
            Ratings for <strong>{LAB_LAYOUTS.find((l) => l.id === activeLayout)?.label}</strong> — stored locally only.
          </p>
          <ul className="elab-eval__list">
            {RATING_METRICS.map((metric) => (
              <li key={metric.id}>
                <span>{metric.label}</span>
                <div className="elab-eval__stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={
                        (current[metric.id] ?? 0) >= n
                          ? "elab-eval__star elab-eval__star--on"
                          : "elab-eval__star"
                      }
                      onClick={() => setRating(metric.id, n)}
                      aria-label={`${metric.label} ${n} of 5`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
