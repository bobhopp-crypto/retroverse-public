import Link from "next/link";
import type { CSSProperties } from "react";

import { RETROVERSE_PRODUCTS } from "@/lib/ops/products";
import type { RetroverseProductContext } from "@/lib/ops/products";

import { ProductIcon } from "./ProductIcons";

type Props = {
  activeProduct: RetroverseProductContext;
};

export function ProductSwitcher({ activeProduct }: Props) {
  return (
    <nav className="rs-shell__switcher" aria-label="Retroverse products">
      <ul className="rs-shell__switcher-list">
        {RETROVERSE_PRODUCTS.map((product) => {
          const isActive = activeProduct === product.slug;
          const pillClass = [
            "rs-shell__pill",
            isActive ? "rs-shell__pill--active" : "",
            !product.available ? "rs-shell__pill--disabled" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <>
              <ProductIcon slug={product.slug} className="rs-shell__pill-icon" />
              <span className="rs-shell__pill-label">{product.name}</span>
              {isActive ? (
                <span className="rs-shell__pill-dot" aria-hidden="true" />
              ) : null}
            </>
          );

          return (
            <li key={product.slug}>
              {product.available ? (
                <Link
                  href={product.homeHref}
                  className={pillClass}
                  aria-current={isActive ? "page" : undefined}
                  style={
                    isActive
                      ? ({ "--rs-shell-pill-accent": product.accentColor } as CSSProperties)
                      : undefined
                  }
                >
                  {content}
                </Link>
              ) : (
                <span
                  className={pillClass}
                  aria-disabled="true"
                  title="Coming soon"
                  style={{ "--rs-shell-pill-accent": product.accentColor } as CSSProperties}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
