import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

export function PlayButton({ tone }: { tone: FlatTone }) {
  return <span className="rv-mag-play" style={toneStyle(tone)} aria-hidden />;
}
