import Link from "next/link";

import {
  OPS_CONSOLE_QUICK_LINKS,
  OPS_DIRECTORY_SECTIONS,
  OPS_PUBLIC_QUICK_LINKS,
  opsStatusTone,
  type OpsDirectoryEntry,
  type OpsQuickLink,
} from "@/lib/ops/operations-directory";

type Props = {
  liveTrackHref?: string | null;
  liveTrackLabel?: string | null;
};

function QuickLinkList(props: { links: OpsQuickLink[]; title: string }) {
  return (
    <div className="ops-dir__quick-block">
      <p className="ops-dir__quick-title">{props.title}</p>
      <ul className="ops-dir__quick-list">
        {props.links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              className="ops-link ops-dir__quick-link"
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.label}
              {link.external ? " ↗" : ""}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DirectoryEntry(props: { entry: OpsDirectoryEntry }) {
  const tone = opsStatusTone(props.entry.status);
  return (
    <li className="ops-dir__entry">
      <div className="ops-dir__entry-head">
        <Link className="ops-dir__entry-name" href={props.entry.href}>
          {props.entry.name}
        </Link>
        <span className={`ops-dir__badge ops-dir__badge--${tone}`}>{props.entry.status}</span>
      </div>
      <p className="ops-dir__entry-desc">{props.entry.description}</p>
      <p className="ops-dir__entry-purpose">{props.entry.purpose}</p>
    </li>
  );
}

export function OpsDirectory(props: Props) {
  const publicLinks = [...OPS_PUBLIC_QUICK_LINKS];
  if (props.liveTrackHref) {
    publicLinks.push({
      label: props.liveTrackLabel ?? "Current Live Track",
      href: props.liveTrackHref,
      external: true,
    });
  }

  return (
    <section className="ops-dir" aria-label="Operations directory">
      <div className="ops-dir__quick-row">
        <QuickLinkList title="Public" links={publicLinks} />
        <QuickLinkList title="Ops" links={OPS_CONSOLE_QUICK_LINKS} />
      </div>

      <div className="ops-dir__sections">
        {OPS_DIRECTORY_SECTIONS.map((section) => (
          <section key={section.id} className="ops-dir__section">
            <header className="ops-dir__section-head">
              <h2 className="ops-dir__section-title">{section.title}</h2>
              <p className="ops-dir__section-subtitle">{section.subtitle}</p>
            </header>
            <ul className="ops-dir__list">
              {section.entries.map((entry) => (
                <DirectoryEntry key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
