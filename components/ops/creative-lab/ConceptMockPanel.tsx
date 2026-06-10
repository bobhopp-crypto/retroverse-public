"use client";

import type { ConceptMockBoard } from "@/lib/ops/creative-lab/concept-mock";

type Props = {
  board: ConceptMockBoard;
  variationKey: string;
};

export function ConceptMockPanel(props: Props) {
  const { board, variationKey } = props;

  return (
    <div className="cl-concept-mock">
      <div className="cl-concept-mock__header">
        <span className="cl-concept-mock__key">CONCEPT {variationKey}</span>
        <span className="cl-concept-mock__strategy">{board.strategyLabel}</span>
      </div>
      <div className="cl-concept-mock__palette" aria-label="Color palette">
        {board.palette.map((color) => (
          <span key={color} className="cl-concept-mock__swatch" style={{ background: color }} title={color} />
        ))}
      </div>
      <div className="cl-concept-mock__pass-preview" aria-hidden>
        <div className="cl-concept-mock__pass-type">{board.artifactLabel}</div>
        <div className="cl-concept-mock__pass-title">{board.title}</div>
      </div>
      <dl className="cl-concept-mock__summary">
        <div>
          <dt>Visual</dt>
          <dd>{board.visualSummary}</dd>
        </div>
        <div>
          <dt>Artifact</dt>
          <dd>{board.artifactSummary}</dd>
        </div>
        <div>
          <dt>Strategy</dt>
          <dd>{board.strategySummary}</dd>
        </div>
        <div>
          <dt>Style</dt>
          <dd>{board.styleSummary}</dd>
        </div>
      </dl>
      {board.influenceTags.length ? (
        <div className="cl-concept-mock__influences">
          {board.influenceTags.map((tag) => (
            <span key={tag} className="cl-concept-mock__influence">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
