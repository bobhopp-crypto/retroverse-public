import Link from "next/link";
import type { ReactNode } from "react";

import { OpsPathPageTitle } from "@/components/bobos/rv-ids";
import type { RvId } from "@/lib/bobos/rv-ids";

type Breadcrumb = { label: string; href: string };

type Props = {
  /** Page name — rendered as the large H1. */
  page: string;
  subtitle?: string;
  /** Current event / project this page is operating on. */
  eventName?: string | null;
  /** Status label shown as a badge next to the event name. */
  status?: string | null;
  /** Visual tone of the status badge. Defaults to neutral. */
  statusTone?: "neutral" | "planning" | "live" | "archived" | "done";
  /** Optional RV ID override; defaults to pathname lookup. */
  rvId?: RvId | null;
  /** Optional back link rendered above the brand line. */
  breadcrumb?: Breadcrumb | null;
  /** Optional extra content for the meta row (e.g. workspace tabs). */
  actions?: ReactNode;
};

/**
 * Standard BobOS page header — identical treatment on every workspace:
 * breadcrumb → BOBOS brand line → page title → subtitle → event + status meta.
 */
export function BobosPageHeader({
  page,
  subtitle,
  eventName,
  status,
  statusTone = "neutral",
  rvId,
  breadcrumb,
  actions,
}: Props) {
  const hasMeta = Boolean(eventName || status || actions);

  return (
    <header className="bobos-page-header">
      {breadcrumb ? (
        <Link href={breadcrumb.href} className="bobos-page-header__crumb">
          ← {breadcrumb.label}
        </Link>
      ) : null}
      <p className="bobos-page-header__brand">BobOS</p>
      <OpsPathPageTitle label={page} rvId={rvId} className="bobos-page-header__title" />
      {subtitle ? <p className="bobos-page-header__subtitle">{subtitle}</p> : null}
      {hasMeta ? (
        <div className="bobos-page-header__meta">
          {eventName ? <span className="bobos-page-header__event">{eventName}</span> : null}
          {status ? <span className={`bobos-badge bobos-badge--${statusTone}`}>{status}</span> : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
