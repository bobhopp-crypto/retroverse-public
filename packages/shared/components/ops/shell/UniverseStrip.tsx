import Link from "next/link";

import type { RetroverseProductContext } from "@/lib/ops/products";

import { ProductSwitcher } from "./ProductSwitcher";

type Props = {
  activeProduct: RetroverseProductContext;
};

export function UniverseStrip({ activeProduct }: Props) {
  const hubMode = activeProduct === null;

  return (
    <header className="rs-shell__universe" aria-label="Retroverse">
      <div className="rs-shell__universe-start">
        <Link className="rs-shell__wordmark" href="/ops">
          Retroverse
        </Link>
        {hubMode ? <p className="rs-shell__hub-label">Operations Directory</p> : null}
      </div>
      <ProductSwitcher activeProduct={activeProduct} />
    </header>
  );
}
