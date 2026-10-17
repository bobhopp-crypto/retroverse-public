import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  kicker: string;
  title: string;
  lede?: string;
  children?: ReactNode;
};

export function Hot100Masthead({ kicker, title, lede, children }: Props) {
  return (
    <header className="hot100-mast">
      <p className="hot100-mast__brand">
        <Link href="/">Retroverse</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/hot100">Hot 100</Link>
      </p>
      <p className="hot100-mast__kicker">{kicker}</p>
      <h1 className="hot100-mast__title">{title}</h1>
      {lede ? <p className="hot100-mast__lede">{lede}</p> : null}
      {children}
    </header>
  );
}
