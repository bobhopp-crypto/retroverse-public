import { ExperiencePlayer } from "@/components/retroverse/renderer/ExperiencePlayer";
import type { PublicExperiencePayload } from "@/lib/retroverse/renderer/load-public-experience";

type Props = {
  payload: PublicExperiencePayload;
};

export function TrainingRendererPreview({ payload }: Props) {
  return (
    <div className="rs-training-renderer">
      <p className="rs-training-renderer__label">Patron preview — swipe exactly what ships</p>
      <div className="rs-training-renderer__phone">
        <ExperiencePlayer payload={payload} />
      </div>
      <p className="rs-training-renderer__link">
        Public URL:{" "}
        <a href={`/experience/${payload.experience.spec.metadata.rvtr}`} target="_blank" rel="noreferrer">
          /experience/{payload.experience.spec.metadata.rvtr}
        </a>
      </p>
    </div>
  );
}
