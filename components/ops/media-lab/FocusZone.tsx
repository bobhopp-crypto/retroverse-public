"use client";

import type { ReactNode } from "react";

type FocusZoneProps = {
  icon: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function FocusZone(props: FocusZoneProps) {
  return (
    <section
      className={["ops-ml-focus-zone", props.className].filter(Boolean).join(" ")}
    >
      <header className="ops-ml-focus-zone__head">
        <span className="ops-ml-focus-zone__icon" aria-hidden="true">
          {props.icon}
        </span>
        <h4 className="ops-ml-focus-zone__label">{props.label}</h4>
      </header>
      <div className="ops-ml-focus-zone__body">{props.children}</div>
    </section>
  );
}
