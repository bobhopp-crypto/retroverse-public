import Link from "next/link";
import type { ReactNode } from "react";

import "../browse/browse.css";

type Props = {
  title: string;
  intro: string;
  children?: ReactNode;
};

export function ArchiveBrowseShell({ title, intro, children }: Props) {
  return (
    <main className="archive-browse">
      <div className="archive-browse__board">
        <header className="archive-browse__header">
          <Link href="/" prefetch className="archive-browse__home">
            ← Retroverse
          </Link>
          <h1 className="archive-browse__title">{title}</h1>
          <p className="archive-browse__intro">{intro}</p>
        </header>

        {children}

        <footer className="archive-browse__footer">
          <Link href="/search" prefetch className="archive-browse__cta">
            Search the archive →
          </Link>
        </footer>
      </div>
    </main>
  );
}
