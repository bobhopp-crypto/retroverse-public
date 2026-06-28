import type { ReactNode } from "react";

import { StudioOperatorGuideRoot } from "@/components/ops/studio/operator-guide/StudioOperatorGuideRoot";

import "./studio-design-tokens.css";
import "./studio-design-utilities.css";
import "./studio.css";
import "./living-studio.css";
import "./operator-guide.css";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioOperatorGuideRoot>{children}</StudioOperatorGuideRoot>;
}
