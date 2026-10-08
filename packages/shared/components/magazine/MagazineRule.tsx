import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

export function MagazineRule({ tone }: { tone: FlatTone }) {
  return <div className="rv-mag-rule" style={toneStyle(tone)} />;
}
