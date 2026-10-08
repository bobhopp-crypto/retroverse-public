"use client";

import { useEffect, useState } from "react";

import type { FlatTone } from "@/lib/theme/magazine-palette";

import { toneStyle } from "./tone";

export type EraRailTab = {
  id: string;
  label: string;
  detail: string;
  tone: FlatTone;
};

type Props = {
  tone: FlatTone;
  tabs: EraRailTab[];
};

export function EraRail({ tone, tabs }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const rail = document.querySelector<HTMLElement>(".rv-mag-rail");
    if (!rail || tabs.length === 0) return;
    const nodes = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((node): node is HTMLElement => node != null);

    const update = () => {
      const line = window.scrollY + rail.getBoundingClientRect().height + 40;
      let next = 0;
      nodes.forEach((node, index) => {
        const top = node.getBoundingClientRect().top + window.scrollY;
        if (top <= line) next = index;
      });
      setActive((current) => (current === next ? current : next));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [tabs]);

  return (
    <nav className="rv-mag-rail" style={toneStyle(tone)} aria-label="Eras">
      <span className="rv-mag-rail__label">Eras</span>
      {tabs.map((tab, index) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          className={index === active ? "is-on" : undefined}
          style={toneStyle(tab.tone)}
          aria-current={index === active ? "true" : undefined}
        >
          {tab.label}
          <small>{tab.detail}</small>
        </a>
      ))}
    </nav>
  );
}
