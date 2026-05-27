/* eslint-disable no-alert */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatBytes } from "@/lib/ops/format-bytes";

export function OpsPill(props: {
  tone: "ok" | "warn" | "bad" | "info";
  children: ReactNode;
}) {
  return <span className={`ops-pill ops-pill--${props.tone}`}>{props.children}</span>;
}

export function OpsActionButton(props: {
  tone?: "ok" | "warn" | "bad" | "info";
  label: string;
  onClickHint?: string;
}) {
  const tone = props.tone || "info";
  return (
    <button
      type="button"
      className={`ops-btn ops-btn--${tone}`}
      title={props.onClickHint || "Stub action (not wired yet)"}
      onClick={() => {
        // Intentionally stubbed: ops console v1 is layout + flow only.
        alert(`${props.label} (stub)`);
      }}
    >
      {props.label}
    </button>
  );
}

export function OpsInlineLink(props: {
  href: string;
  children: ReactNode;
  title?: string;
  external?: boolean;
}) {
  if (props.external || /^https?:\/\//i.test(props.href)) {
    return (
      <a
        className="ops-link"
        href={props.href}
        title={props.title}
        target="_blank"
        rel="noopener noreferrer"
      >
        {props.children}
      </a>
    );
  }
  return (
    <Link className="ops-link" href={props.href} title={props.title}>
      {props.children}
    </Link>
  );
}

export function OpsTable(props: {
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: {
    id: string;
    cells: Record<string, ReactNode>;
    tone?: "ok" | "warn" | "bad" | "info";
    className?: string;
  }[];
  empty?: string;
}) {
  if (!props.rows.length) {
    return <p className="ops-empty">{props.empty || "Nothing in this queue."}</p>;
  }

  return (
    <div className="ops-tablewrap">
      <table className="ops-table">
        <thead>
          <tr>
            {props.columns.map((col) => (
              <th
                key={col.key}
                className={`ops-th${col.align === "right" ? " ops-th--right" : ""}`}
                scope="col"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, index) => (
            <tr
              key={row.id || `ops-row-${index}`}
              className={[
                "ops-tr",
                row.tone ? `ops-tr--${row.tone}` : "",
                row.className || "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {props.columns.map((col) => (
                <td
                  key={`${row.id}-${col.key}`}
                  className={`ops-td${col.align === "right" ? " ops-td--right" : ""}`}
                >
                  {row.cells[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const OpsFormat = {
  bytes: formatBytes,
};

