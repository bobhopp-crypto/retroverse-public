import type { ReactNode } from "react";

import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

type Props = {
  tone?: FlatTone;
  variant: "letter" | "cover" | "poster";
  title?: string;
  year?: number | null;
  children?: ReactNode;
};

export function TitleTile({ tone, variant, title, year, children }: Props) {
  return (
    <div className={`rv-mag-tile rv-mag-tile--${variant}`} style={tone ? toneStyle(tone) : undefined}>
      {variant === "cover" ? (
        <>
          <span className="rv-mag-tile__title">{title}</span>
          {year != null ? <span className="rv-mag-tile__year">{year}</span> : null}
        </>
      ) : (
        children
      )}
    </div>
  );
}
