import type { ReactNode } from "react";

import "../ops/ops.css";
import "./local.css";

export default function LocalStudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="local-studio-shell ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">{children}</div>
    </div>
  );
}
