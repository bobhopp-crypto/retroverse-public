import type { ReactNode } from "react";

import { AtlasEncyclopediaNav } from "@/components/atlas/AtlasEncyclopediaNav";

import "../architecture/atlas-architecture.css";
import "../../ops.css";
import "@/components/atlas/atlas-encyclopedia-nav.css";

export default function AtlasLegacyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="atlas-arch-shell ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AtlasEncyclopediaNav />
        {children}
      </div>
    </div>
  );
}
