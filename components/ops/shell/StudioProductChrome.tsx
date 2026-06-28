import Link from "next/link";

import { getRetroverseProduct } from "@/lib/ops/products";

import { ProductIcon } from "./ProductIcons";

export type StudioProductNavKey =
  | "mission-control"
  | "library-queue"
  | "collector"
  | "editor"
  | "director"
  | "publisher";

type NavItem = {
  key: StudioProductNavKey;
  label: string;
  href: string;
};

const NAV: NavItem[] = [
  { key: "mission-control", label: "Mission Control", href: "/ops/studio" },
  { key: "library-queue", label: "Library & Queue", href: "/ops/browser-plus-2" },
  { key: "collector", label: "Collector", href: "/ops/studio/collector" },
  { key: "editor", label: "Editor", href: "/ops/studio/editor" },
  { key: "director", label: "Director", href: "/ops/studio/director" },
  { key: "publisher", label: "Publisher", href: "/ops/studio/publisher" },
];

type Props = {
  active: StudioProductNavKey;
};

export function StudioProductChrome({ active }: Props) {
  const product = getRetroverseProduct("studio");

  return (
    <header className="rs-shell__product-inner" aria-label="Studio">
      <div className="rs-shell__product-identity">
        <ProductIcon slug="studio" className="rs-shell__product-icon" />
        <div>
          <p className="rs-shell__product-name">{product.name}</p>
          <p className="rs-shell__product-mission">{product.mission}</p>
        </div>
      </div>

      <nav className="rs-shell__product-nav" aria-label="Studio departments">
        {NAV.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? "page" : undefined}
            className={
              active === item.key
                ? "rs-shell__product-nav-link rs-shell__product-nav-link--active"
                : "rs-shell__product-nav-link"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
