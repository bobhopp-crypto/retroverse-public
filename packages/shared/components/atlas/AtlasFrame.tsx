import type { ReactNode } from "react";

import type { AtlasRailActive } from "./AtlasRail";
import { AtlasLegacyBanner, AtlasLegacyNav } from "./AtlasLegacyNav";
import { TwoRealitiesPlaque } from "./TwoRealitiesPlaque";
import type { AtlasRealities } from "@/lib/atlas/types";

import "./atlas-legacy-nav.css";

type Props = {
  active: AtlasRailActive;
  realities: AtlasRealities;
  children: ReactNode;
};

export function AtlasFrame({ active: _active, realities, children }: Props) {
  return (
    <div className="atlas-app">
      <div className="atlas-app__grain" aria-hidden />
      <AtlasLegacyNav />
      <AtlasLegacyBanner />
      <TwoRealitiesPlaque realities={realities} />
      <div className="atlas-app__body">{children}</div>
    </div>
  );
}
