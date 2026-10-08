import type { ReactNode } from "react";

import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

type Props = {
  tone: FlatTone;
  cite: string;
  children: ReactNode;
};

export function PullQuote({ tone, cite, children }: Props) {
  return (
    <blockquote className="rv-mag-quote" style={toneStyle(tone)}>
      <q>{children}</q>
      <cite>{cite}</cite>
    </blockquote>
  );
}
