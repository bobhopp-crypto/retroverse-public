"use client";

import { useState } from "react";

import { HomeSearchOverlay } from "./home-search-overlay";
import "./home-search-overlay.css";

/**
 * Homepage search trigger — opens isolated fullscreen terminal.
 * No inline input, autocomplete, or layout expansion on the homepage.
 */
export function HomeSearchInput() {
  const [open, setOpen] = useState(false);

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

      {open ? <HomeSearchOverlay onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
