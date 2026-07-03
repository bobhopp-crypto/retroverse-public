"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { AllStarDisc } from "@/lib/ops/allstar/types";

const POSITIONS = [
  "All",
  "Pitcher",
  "Catcher",
  "First Base",
  "Second Base",
  "Third Base",
  "Shortstop",
  "Left Field",
  "Center Field",
  "Right Field",
  "Outfield",
  "Infield",
  "Manager",
];

function statusLabel(status: AllStarDisc["processingStatus"]): string {
  switch (status) {
    case "processed":
      return "Processed";
    case "ocr_partial":
      return "OCR Partial";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function geometryLabel(status: AllStarDisc["geometryStatus"]): string {
  switch (status) {
    case "ok":
      return "OK";
    case "warning":
      return "Warning";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

type Props = {
  discs: AllStarDisc[];
};

export function AllStarLibraryTable({ discs }: Props) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return discs.filter((disc) => {
      if (position !== "All") {
        const pos = disc.position.toLowerCase();
        if (!pos.includes(position.toLowerCase())) return false;
      }
      if (!q) return true;
      return (
        disc.player.toLowerCase().includes(q) ||
        disc.id.toLowerCase().includes(q) ||
        disc.scanFilename.toLowerCase().includes(q)
      );
    });
  }, [discs, query, position]);

  return (
    <section className="ops-allstar__section" aria-labelledby="allstar-library">
      <div className="ops-allstar__toolbar">
        <h2 id="allstar-library" className="ops-command__section-title">
          Disc Library
        </h2>
        <p className="ops-allstar__count">{filtered.length} discs</p>
      </div>

      <div className="ops-allstar__filters">
        <label className="ops-allstar__search">
          <span>Search player</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Player name or scan id"
          />
        </label>
        <label className="ops-allstar__select">
          <span>Position</span>
          <select value={position} onChange={(e) => setPosition(e.target.value)}>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ops-allstar__table-wrap">
        <table className="ops-allstar__table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Player</th>
              <th>Position</th>
              <th>Processing</th>
              <th>Geometry</th>
              <th>Outcomes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((disc) => (
              <tr key={disc.id}>
                <td>
                  <img
                    className="ops-allstar__thumb"
                    src={`/api/ops/allstar/image?kind=scan&id=${encodeURIComponent(disc.id)}`}
                    alt=""
                    loading="lazy"
                    width={56}
                    height={56}
                  />
                </td>
                <td>
                  <strong>{disc.player || "—"}</strong>
                  <small>{disc.scanFilename}</small>
                </td>
                <td>{disc.position || "—"}</td>
                <td>
                  <span className={`ops-allstar__pill ops-allstar__pill--${disc.processingStatus}`}>
                    {statusLabel(disc.processingStatus)}
                  </span>
                </td>
                <td>
                  <span className={`ops-allstar__pill ops-allstar__pill--geo-${disc.geometryStatus}`}>
                    {geometryLabel(disc.geometryStatus)}
                  </span>
                </td>
                <td>{disc.labeledWedgeCount ?? "—"}</td>
                <td>
                  {disc.processingStatus === "processed" ? (
                    <Link href={`/ops/allstar/player/${disc.id}`}>Player</Link>
                  ) : null}{" "}
                  <Link href={`/ops/allstar/analysis/${disc.id}`}>Analyze</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? (
          <p className="ops-allstar__empty">No discs match your filters.</p>
        ) : null}
      </div>
    </section>
  );
}
