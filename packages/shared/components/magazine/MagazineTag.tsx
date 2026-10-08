import type { ReactNode } from "react";

import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

type Props = {
  tone: FlatTone;
  children: ReactNode;
  className?: string;
};

export function MagazineTag({ tone, children, className }: Props) {
  const classes = ["rv-mag-tag", className].filter(Boolean).join(" ");
  return (
    <span className={classes} style={toneStyle(tone)}>
      {children}
    </span>
  );
}
