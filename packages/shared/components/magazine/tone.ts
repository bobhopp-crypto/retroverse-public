import type { CSSProperties } from "react";

import type { FlatTone } from "@/lib/theme/magazine-palette";

export function toneStyle(tone: FlatTone): CSSProperties {
  const style: Record<string, string> = {
    "--a": tone.a,
    "--t": tone.ink,
  };
  if (tone.b) style["--b"] = tone.b;
  if (tone.c) style["--c"] = tone.c;
  return style as CSSProperties;
}
