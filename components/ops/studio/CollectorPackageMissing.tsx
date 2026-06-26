import Link from "next/link";

import { SongWorkspaceTabs } from "@/components/ops/studio/SongWorkspaceTabs";

type Props = {
  rvtr: string;
};

export function CollectorPackageMissing({ rvtr }: Props) {
  return (
    <div className="ops-collector-lib">
      <SongWorkspaceTabs active="research" />

      <p className="ops-collector__library-back">
        <Link className="ops-studio__back" href="/ops/studio/collector">
          ← Research Library
        </Link>
      </p>

      <section className="ops-collector-lib__missing" aria-labelledby="collector-missing">
        <p className="ops-collector-lib__eyebrow">{rvtr}</p>
        <h1 id="collector-missing" className="ops-collector-lib__title">
          Research package not created yet.
        </h1>
        <p className="ops-collector-lib__missing-copy">Run Collector to begin research.</p>
      </section>
    </div>
  );
}
