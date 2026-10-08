import type { ReactNode } from "react";

import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

type Props = {
  value: ReactNode;
  label: string;
  tone: FlatTone;
};

/** Short fact. The number carries the color. The block stays unfilled. */
export function MagazineStat({ value, label, tone }: Props) {
  return (
    <div className="rv-mag-stat" style={toneStyle(tone)}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
