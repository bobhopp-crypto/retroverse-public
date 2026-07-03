import type { ReactNode } from "react";

import "../ops.css";
import "./library.css";

export default function ProductionLibraryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="prod-lib-shell ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">{children}</div>
    </div>
  );
}
