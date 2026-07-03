"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { CollectionAuditReport } from "@/lib/ops/allstar/collection-audit";

export function AllStarAuditPanel() {
  const [audit, setAudit] = useState<CollectionAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/allstar/audit", { cache: "no-store" });
      if (!res.ok) throw new Error("Audit unavailable");
      setAudit((await res.json()) as CollectionAuditReport);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error && !audit) return <p className="ops-allstar__empty">{error}</p>;
  if (!audit) return <p className="ops-allstar__empty">Running collection audit…</p>;

  const categories = [
    { key: "missing_archive", label: "Missing archive JSON" },
    { key: "missing_review", label: "Missing review image" },
    { key: "missing_intelligence", label: "Missing intelligence file" },
    { key: "ocr_failure", label: "OCR failures" },
    { key: "geometry_failure", label: "Geometry failures" },
    { key: "duplicate_player", label: "Duplicate player records" },
  ] as const;

  return (
    <div className="ops-allstar__intel">
      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <div className="ops-allstar__archive-panel-head">
          <h2>Collection Health Report</h2>
          <span className={`ops-allstar__live-pill ops-allstar__live-pill--${audit.clean ? "ok" : "warn"}`}>
            {audit.clean ? "Clean" : `${audit.issues.length} issues`}
          </span>
        </div>
        <div className="ops-allstar__research-grid">
          <article className="ops-allstar__research-stat">
            <strong>Scans</strong>
            <span>{audit.totalScans}</span>
          </article>
          <article className="ops-allstar__research-stat">
            <strong>Archive JSON</strong>
            <span>{audit.archiveCount}</span>
          </article>
          <article className="ops-allstar__research-stat">
            <strong>Review images</strong>
            <span>{audit.reviewCount}</span>
          </article>
          <article className="ops-allstar__research-stat">
            <strong>Intelligence</strong>
            <span>{audit.intelligenceCount}</span>
          </article>
        </div>
        <p className="ops-allstar__comparison-lead">
          Target: {audit.totalScans} / {audit.totalScans} preserved with full artifact chain.
        </p>
      </section>

      <div className="ops-allstar__archive-grid">
        {categories.map((cat) => {
          const items = audit.issues.filter((i) => i.category === cat.key);
          return (
            <section key={cat.key} className="ops-allstar__archive-panel">
              <h3>{cat.label}</h3>
              <p>{items.length} issue{items.length === 1 ? "" : "s"}</p>
              {items.length ? (
                <ul className="ops-allstar__rank-list">
                  {items.slice(0, 8).map((item) => (
                    <li key={`${cat.key}-${item.discId}`}>
                      <Link href={`/ops/allstar/analysis/${item.discId}`}>
                        {item.player || item.discId}
                      </Link>
                      <span>{item.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ops-allstar__empty">None</p>
              )}
            </section>
          );
        })}
      </div>

      {audit.masterDatasetReady ? (
        <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
          <h3>Master Dataset</h3>
          <p className="ops-allstar__comparison-lead">
            Canonical archive at <code>{audit.masterDatasetPath}</code>
          </p>
        </section>
      ) : null}
    </div>
  );
}
