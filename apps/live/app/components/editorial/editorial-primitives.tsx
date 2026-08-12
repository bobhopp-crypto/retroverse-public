import Link from "next/link";
import type { ReactNode } from "react";
import { HomeSearchInput } from "@/app/components/home-search-input";
import "./editorial-tokens.css";
import "./editorial-primitives.css";

export function EditorialPageShell({ children, accent, footerLabel = "Music archive", showSearch = true }: { children: ReactNode; accent?: string; footerLabel?: string; showSearch?: boolean }) {
  return <main className="editorial-shell" style={accent ? { "--editorial-accent": accent } as React.CSSProperties : undefined}>
    <div className="editorial-shell__page">
      <header className="editorial-shell__masthead"><Link href="/" aria-label="Return to Retroverse">Music / Archive</Link></header>
      {showSearch ? <div className="editorial-shell__search"><HomeSearchInput /></div> : null}
      {children}
      <footer className="editorial-shell__footer">{footerLabel}</footer>
    </div>
  </main>;
}

export function EditorialHero({ children, imageUrl, alt = "" }: { children?: ReactNode; imageUrl?: string | null; alt?: string }) {
  return <header className="editorial-hero">{imageUrl ? <img src={imageUrl} alt={alt} /> : null}<div className="editorial-hero__copy">{children}</div></header>;
}

export function EditorialSection({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return <section className="editorial-section" id={id} aria-labelledby={id ? `${id}-heading` : undefined}><h2 id={id ? `${id}-heading` : undefined}>{title}</h2>{children}</section>;
}

export function EditorialRule() { return <hr className="editorial-rule" />; }

export function EditorialMetadataRow({ label, value, href }: { label: string; value: ReactNode; href?: string | null }) {
  const content = <><span className="editorial-metadata-row__label">{label}</span><span className="editorial-metadata-row__value">{value}</span><span aria-hidden>→</span></>;
  return href ? <Link className="editorial-metadata-row" href={href}>{content}</Link> : <div className="editorial-metadata-row">{content}</div>;
}

export function EditorialStatus({ children }: { children: ReactNode }) { return <p className="editorial-status">{children}</p>; }

export function EditorialList({ children }: { children: ReactNode }) { return <ul className="editorial-list">{children}</ul>; }
