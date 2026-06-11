import type { GenerationQualitySnapshot } from "@/lib/ops/content-creator/library/types";

type Props = {
  eraName: string;
  creativeDirectionLabel: string;
  timestamp: string;
  quality: GenerationQualitySnapshot;
};

function badgeClass(level: string): string {
  if (level === "high") return "cc-gen-badge--high";
  if (level === "low") return "cc-gen-badge--low";
  return "cc-gen-badge--med";
}

function clicheBadgeClass(risk: string): string {
  if (risk === "high") return "cc-gen-badge--low";
  if (risk === "low") return "cc-gen-badge--high";
  return "cc-gen-badge--med";
}

export function GenerationQualityBadges({ eraName, creativeDirectionLabel, timestamp, quality }: Props) {
  return (
    <div className="cc-gen-badges" aria-label="Generation quality">
      <span className="cc-gen-badge">{eraName}</span>
      <span className="cc-gen-badge">{creativeDirectionLabel}</span>
      <span className="cc-gen-badge cc-gen-badge--dim">
        {new Date(timestamp).toLocaleDateString()}
      </span>
      <span className="cc-gen-badge cc-gen-badge--dim">
        Prompt {quality.promptCharCount.toLocaleString()}c
      </span>
      <span className={`cc-gen-badge ${badgeClass(quality.variationScore)}`}>
        Var {quality.variationScore}
      </span>
      <span className={`cc-gen-badge ${clicheBadgeClass(quality.clicheRisk)}`}>
        Cliché {quality.clicheRisk}
      </span>
    </div>
  );
}
