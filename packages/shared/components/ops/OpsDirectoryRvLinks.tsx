"use client";

import Link from "next/link";

import { RvIdLabel } from "@/components/bobos/rv-ids";
import { getRvIdByDirectoryId, getRvIdByHref } from "@/lib/bobos/rv-ids";
import type { OpsDirectoryEntry, OpsQuickLink } from "@/lib/ops/operations-directory";

type EntryProps = {
  entry: OpsDirectoryEntry;
  tone: string;
};

export function OpsDirectoryEntryLink({ entry, tone }: EntryProps) {
  return (
    <li className="ops-dir__entry">
      <div className="ops-dir__entry-head">
        <Link className="ops-dir__entry-name" href={entry.href}>
          <RvIdLabel rvId={getRvIdByDirectoryId(entry.id)} label={entry.name} />
        </Link>
        <span className={`ops-dir__badge ops-dir__badge--${tone}`}>{entry.status}</span>
      </div>
      <p className="ops-dir__entry-desc">{entry.description}</p>
      <p className="ops-dir__entry-purpose">{entry.purpose}</p>
    </li>
  );
}

type QuickLinkProps = {
  link: OpsQuickLink;
};

export function OpsDirectoryQuickLink({ link }: QuickLinkProps) {
  return (
    <li>
      <Link
        className="ops-link ops-dir__quick-link"
        href={link.href}
        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <RvIdLabel rvId={getRvIdByHref(link.href)} label={link.label} />
        {link.external ? " ↗" : ""}
      </Link>
    </li>
  );
}
