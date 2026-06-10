"use client";

type Props = {
  round: 1 | 2 | 3;
};

const ROUNDS = [
  { n: 1, label: "Concept Selection" },
  { n: 2, label: "Variation Selection" },
  { n: 3, label: "Asset Generation" },
] as const;

export function WorkflowRoundIndicator(props: Props) {
  const { round } = props;

  return (
    <nav className="cl-workflow-rounds" aria-label="Creative workflow round">
      {ROUNDS.map((r) => {
        const on = round === r.n;
        const done = round > r.n;
        return (
          <div
            key={r.n}
            className={`cl-workflow-rounds__step${on ? " cl-workflow-rounds__step--on" : ""}${done ? " cl-workflow-rounds__step--done" : ""}${r.n === 3 ? " cl-workflow-rounds__step--future" : ""}`}
          >
            <span className="cl-workflow-rounds__num">Round {r.n}</span>
            <span className="cl-workflow-rounds__label">{r.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
