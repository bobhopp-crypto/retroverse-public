import Link from "next/link";
import type { ReactNode } from "react";

import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

type Props = {
  tone: FlatTone;
  href: string | null;
  label: string;
  children: ReactNode;
};

export function MagazineCard({ tone, href, label, children }: Props) {
  const style = toneStyle(tone);
  if (!href) {
    return (
      <div className="rv-mag-card" style={style}>
        {children}
      </div>
    );
  }
  return (
    <Link href={href} prefetch className="rv-mag-card" style={style} aria-label={label}>
      {children}
    </Link>
  );
}
