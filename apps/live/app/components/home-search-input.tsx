"use client";

import { useState } from "react";

import type { HomeSearchScope } from "@/lib/search/home-search-scope";

import { HomeSearchOverlay } from "./home-search-overlay";
import "./home-search-overlay.css";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  scope?: HomeSearchScope;
};

/**
 * Homepage search trigger — opens isolated fullscreen terminal.
 * No inline input, autocomplete, or layout expansion on the homepage.
 */
export function HomeSearchInput({
  open: openControlled,
  onOpenChange,
  scope = "all",
}: Props) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openControlled ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;

  return (
    <div className={`home-search-wrap${open ? " home-search-wrap--open" : ""}`}>
      <button
        type="button"
        className="home-search-trigger"
        aria-label="Search Retroverse"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="home-search-trigger__hint">Search the stacks…</span>
        <span className="home-search-trigger__icon" aria-hidden />
      </button>

      {open ? (
        <HomeSearchOverlay scope={scope} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
