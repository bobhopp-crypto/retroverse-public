"use client";

import Link from "next/link";

const WORKSPACE_TABS = [
  {
    id: "research",
    label: "Research",
    enabled: true,
    href: (rvtr?: string) =>
      rvtr ? `/ops/studio/collector/${rvtr}` : "/ops/studio/collector",
  },
  {
    id: "story",
    label: "Story",
    enabled: true,
    href: (rvtr?: string) => (rvtr ? `/ops/studio/editor/${rvtr}` : "/ops/studio/editor"),
  },
  {
    id: "experience",
    label: "Experience",
    enabled: false,
    href: () => "#",
  },
  {
    id: "publish",
    label: "Publish",
    enabled: false,
    href: () => "#",
  },
  {
    id: "history",
    label: "History",
    enabled: false,
    href: () => "#",
  },
] as const;

type TabId = (typeof WORKSPACE_TABS)[number]["id"];

type Props = {
  active?: TabId;
  rvtr?: string;
};

export function SongWorkspaceTabs({ active = "research", rvtr }: Props) {
  return (
    <nav className="ops-collector-workspace" aria-label="Song workspace departments">
      <ul className="ops-collector-workspace__tabs">
        {WORKSPACE_TABS.map((tab) => {
          const isActive = tab.enabled && tab.id === active;
          const className = isActive
            ? "ops-collector-workspace__tab ops-collector-workspace__tab--active"
            : tab.enabled
              ? "ops-collector-workspace__tab"
              : "ops-collector-workspace__tab ops-collector-workspace__tab--disabled";

          return (
            <li key={tab.id}>
              {tab.enabled && !isActive ? (
                <Link className={className} href={tab.href(rvtr)}>
                  {tab.label}
                </Link>
              ) : (
                <span className={className} aria-disabled={!tab.enabled} aria-current={isActive ? "page" : undefined}>
                  {tab.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
