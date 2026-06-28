import type { ReactNode } from "react";

import "@/app/experience/[rvtr]/experience.css";

import "./training.css";

export default function TrainingLayout({ children }: { children: ReactNode }) {
  return <div className="rs-training-root">{children}</div>;
}
