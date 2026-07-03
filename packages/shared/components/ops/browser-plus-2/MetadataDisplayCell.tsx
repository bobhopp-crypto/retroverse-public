"use client";

import type { Bp2Row } from "@/lib/ops/browser-plus-2/types";
import {
  metadataDisplayArtist,
  metadataDisplayTitle,
} from "@/lib/ops/browser-plus-2/filename-metadata-recovery";

type MetadataDisplayCellProps = {
  row: Bp2Row;
  field: "artist" | "title";
};

export function MetadataDisplayCell({ row, field }: MetadataDisplayCellProps) {
  const display = field === "artist" ? metadataDisplayArtist(row) : metadataDisplayTitle(row);

  return (
    <span className="bp2__display-cell">
      <span>{display.value}</span>
      {display.recoveredFromFilename ? (
        <span className="bp2__recovered-tag" title="Presentation only — not written to VirtualDJ XML">
          Recovered from filename
        </span>
      ) : null}
    </span>
  );
}

export function MetadataDisplayLine({ row, field }: MetadataDisplayCellProps) {
  const display = field === "artist" ? metadataDisplayArtist(row) : metadataDisplayTitle(row);

  return (
    <span className="bp2__display-line">
      {display.value}
      {display.recoveredFromFilename ? (
        <span className="bp2__recovered-tag">Recovered from filename</span>
      ) : null}
    </span>
  );
}
