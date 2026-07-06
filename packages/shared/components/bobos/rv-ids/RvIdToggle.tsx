"use client";

import { useShowRvIds } from "@/lib/bobos/use-show-rv-ids";

import "./rv-id.css";

export function RvIdToggle() {
  const [show, setShow] = useShowRvIds();

  return (
    <label className="rv-id-toggle">
      <input
        type="checkbox"
        checked={show}
        onChange={(event) => setShow(event.target.checked)}
      />
      <span className="rv-id-toggle__text">RV IDs: {show ? "On" : "Off"}</span>
    </label>
  );
}
