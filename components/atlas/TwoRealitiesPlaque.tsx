import type { AtlasRealities } from "@/lib/atlas/types";

type Props = {
  realities: AtlasRealities;
};

export function TwoRealitiesPlaque({ realities }: Props) {
  return (
    <aside className="atlas-realities" aria-label="Studio and Stage alignment">
      <div className="atlas-realities__cols">
        <div className="atlas-realities__col">
          <p className="atlas-realities__label">Studio</p>
          <p className="atlas-realities__line">{realities.studio.showFloor}</p>
        </div>
        <div className="atlas-realities__divider" aria-hidden>
          ⟷
        </div>
        <div className="atlas-realities__col">
          <p className="atlas-realities__label">Stage</p>
          <p className="atlas-realities__line">{realities.stage.showFloor}</p>
        </div>
      </div>
      <div className="atlas-realities__verdicts">
        <span className={`atlas-realities__chip atlas-realities__chip--${slug(realities.alignment)}`}>
          {realities.alignment}
        </span>
        <span className={`atlas-realities__chip atlas-realities__chip--${slug(realities.syncStatus)}`}>
          {realities.syncStatus}
        </span>
        <span className={`atlas-realities__chip atlas-realities__chip--${slug(realities.deployReadiness)}`}>
          {realities.deployReadiness}
        </span>
      </div>
    </aside>
  );
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}
