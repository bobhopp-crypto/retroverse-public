import type { PreservationMilestone } from "@/lib/ops/allstar/intelligence/types";

type Props = {
  milestones: PreservationMilestone[];
};

export function AllStarMilestonesPanel({ milestones }: Props) {
  return (
    <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
      <h2>Preservation Milestones</h2>
      <div className="ops-allstar__milestones">
        {milestones.map((milestone) => (
          <article
            key={milestone.id}
            className={`ops-allstar__milestone ${milestone.unlocked ? "is-unlocked" : ""}`}
          >
            <div className="ops-allstar__milestone-head">
              <strong>{milestone.label}</strong>
              <span>{milestone.unlocked ? "Unlocked" : `${milestone.current}/${milestone.target}`}</span>
            </div>
            <p>{milestone.description}</p>
            <div className="ops-allstar__bar-track">
              <div
                className="ops-allstar__bar-fill ops-allstar__bar-fill--archive"
                style={{
                  width: `${Math.min(100, Math.round((milestone.current / Math.max(milestone.target, 1)) * 100))}%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
