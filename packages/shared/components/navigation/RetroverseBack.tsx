"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

import {
  hasInternalBackEntry,
  RETROVERSE_HISTORY_EVENT,
} from "@/lib/navigation/internal-history";

import "./retroverse-back.css";

type Props = {
  fallbackHref: string;
  fallbackLabel: string;
  className?: string;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function RetroverseBack({ fallbackHref, fallbackLabel, className }: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const sync = () => setCanGoBack(hasInternalBackEntry());
    sync();
    window.addEventListener(RETROVERSE_HISTORY_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(RETROVERSE_HISTORY_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const classes = ["rv-context-back", className].filter(Boolean).join(" ");
  const label = canGoBack ? "Back" : fallbackLabel;

  return (
    <Link
      href={fallbackHref}
      prefetch
      className={classes}
      onClick={(event) => {
        if (isModifiedClick(event) || !hasInternalBackEntry()) return;
        event.preventDefault();
        router.back();
      }}
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

