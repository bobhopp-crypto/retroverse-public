"use client";

import { usePathname } from "next/navigation";

import { OpsPathPageTitle } from "@/components/bobos/rv-ids";
import { getRvIdByPathname } from "@/lib/bobos/rv-ids";

type Props = {
  title: string;
  lead?: string;
  eventName: string;
  status: string;
  statusClassName: string;
};

export function EventStudioPageHeader({ title, lead, eventName, status, statusClassName }: Props) {
  const pathname = usePathname();
  const rvId = getRvIdByPathname(pathname);
  const isLegacyShell =
    pathname.startsWith("/ops/event-studio") && !pathname.endsWith("/producer");
  const kicker = isLegacyShell ? "Legacy Event Tools" : "BobOS";

  return (
    <header className="ops-event-studio__head">
      <div>
        <p className="ops-event-studio__section-kicker">{kicker}</p>
        <OpsPathPageTitle label={title} rvId={rvId} className="ops-event-studio__page-title" />
        {lead ? <p className="ops-event-studio__page-lead">{lead}</p> : null}
        <div className="ops-event-studio__head-meta">
          <span className="ops-event-studio__head-event">{eventName}</span>
          <span className={statusClassName}>{status}</span>
        </div>
      </div>
    </header>
  );
}
