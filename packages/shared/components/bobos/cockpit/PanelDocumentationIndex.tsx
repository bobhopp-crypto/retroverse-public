"use client";

import Link from "next/link";

import {
  PANEL_DOCS_LIBRARY_HREF,
  type PanelDocIndexRow,
} from "@/lib/bobos/cockpit/panel-docs";
import { panelVerificationLabel } from "@/lib/bobos/cockpit/panel-verification";
import { formatRvId } from "@/lib/bobos/rv-ids";

type Props = {
  rows: PanelDocIndexRow[];
  /** Compact variant for embedding near Cockpit chrome. */
  embedded?: boolean;
};

function verificationCell(row: PanelDocIndexRow): string {
  if (!row.documented || !row.verificationStatus) return "—";
  return panelVerificationLabel(row.verificationStatus);
}

/** RV00-00 Panel Documentation index — reads the typed panel-docs registry. */
export function PanelDocumentationIndex({ rows, embedded = false }: Props) {
  const documentedCount = rows.filter((row) => row.documented).length;

  return (
    <section className={`cockpit-docs-index${embedded ? " cockpit-docs-index--embedded" : ""}`}>
      <header className="cockpit-docs-index__head">
        <p className="cockpit-docs-index__kicker">RV 00-00 · Platform</p>
        <h1 className="cockpit-docs-index__title">Panel Documentation</h1>
        <p className="cockpit-docs-index__deck">
          Indexed operator manuals for BobOS panels. Source of truth: typed registry
          <code className="cockpit-docs-index__code"> panel-docs/registry.ts</code>. Cockpit (RV 01-01)
          presents and navigates this library; panel stamps open the same records.
        </p>
        <p className="cockpit-docs-index__meta">
          {documentedCount} documented · {rows.length} panel-eligible · sorted by RV number
        </p>
      </header>

      <div className="cockpit-docs-index__table-wrap">
        <table className="cockpit-docs-index__table">
          <thead>
            <tr>
              <th scope="col">RV</th>
              <th scope="col">Panel</th>
              <th scope="col">Category</th>
              <th scope="col">Verification</th>
              <th scope="col">Last verified</th>
              <th scope="col">Documentation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rvId} className={row.documented ? undefined : "cockpit-docs-index__row--empty"}>
                <td>
                  <span className="cockpit-docs-index__rv">{formatRvId(row.rvId)}</span>
                </td>
                <td>
                  {row.documented && row.manualHref ? (
                    <Link href={row.manualHref} className="cockpit-docs-index__link">
                      {row.title}
                    </Link>
                  ) : (
                    row.title
                  )}
                </td>
                <td>
                  {row.categoryId} · {row.category}
                </td>
                <td>
                  <span
                    className={`cockpit-docs-index__pill${
                      row.verificationStatus === "verified" ? " cockpit-docs-index__pill--ok" : ""
                    }`}
                  >
                    {verificationCell(row)}
                  </span>
                </td>
                <td>{row.verifiedAt ?? "—"}</td>
                <td>
                  {row.documented && row.manualHref ? (
                    <Link href={row.manualHref} className="cockpit-docs-index__open">
                      Open manual
                    </Link>
                  ) : (
                    <span className="cockpit-docs-index__missing">Not documented</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!embedded ? (
        <p className="cockpit-docs-index__foot">
          <Link href="/bobos" className="cockpit-docs-index__back">
            ← Back to Cockpit
          </Link>
          {" · "}
          <Link href={PANEL_DOCS_LIBRARY_HREF} className="cockpit-docs-index__back">
            Library index
          </Link>
        </p>
      ) : null}
    </section>
  );
}
