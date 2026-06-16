import type { ReactNode } from "react";

import type { AtlasRailActive } from "./AtlasRail";
import { AtlasRail } from "./AtlasRail";
import { TwoRealitiesPlaque } from "./TwoRealitiesPlaque";
import type { AtlasRealities } from "@/lib/atlas/types";

type Props = {
  active: AtlasRailActive;
  realities: AtlasRealities;
  children: ReactNode;
};

export function AtlasFrame({ active, realities, children }: Props) {
  return (
    <div className="atlas-app">
      <div className="atlas-app__grain" aria-hidden />
      <AtlasRail active={active} />
      <TwoRealitiesPlaque realities={realities} />
      <div className="atlas-app__body">{children}</div>
    </div>
  );
}
