import type { ReactNode } from "react";

import "./hot100.css";

export default function Hot100Layout({ children }: { children: ReactNode }) {
  return <div className="hot100-root">{children}</div>;
}
