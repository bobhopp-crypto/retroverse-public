import type { ReactNode } from "react";

import type { RetroverseProductContext } from "@/lib/ops/products";

import { UniverseStrip } from "./UniverseStrip";

import "@/app/ops/shell/retroverse-shell.css";

type Props = {
  /** Active product; `null` for Command Center hub mode. */
  product: RetroverseProductContext;
  /** Tier-2 product chrome (local nav, mission line) — wired in D-005+. */
  productChrome?: ReactNode;
  /** Fill viewport height — use when shell wraps a full-height ops page. */
  fillViewport?: boolean;
  children: ReactNode;
};

export function RetroverseShell({ product, productChrome, fillViewport, children }: Props) {
  const shellClass = ["rs-shell", fillViewport ? "rs-shell--viewport" : ""].filter(Boolean).join(" ");

  return (
    <div
      className={shellClass}
      data-product={product ?? undefined}
      data-hub={product === null ? "true" : undefined}
    >
      <UniverseStrip activeProduct={product} />
      {productChrome ? <div className="rs-shell__product">{productChrome}</div> : null}
      <div className="rs-shell__main">{children}</div>
    </div>
  );
}
