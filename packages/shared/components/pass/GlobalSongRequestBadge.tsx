"use client";

import { useEffect, useState } from "react";

import { GuestSongRequestPanel } from "./GuestSongRequestPanel";

import "./pass-experience-overlay.css";

const PASS_SERIAL_KEY = "retroverse:registered-pass-serial";

export function rememberRegisteredPass(serial: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PASS_SERIAL_KEY, serial);
  }
}

export function GlobalSongRequestBadge() {
  const [serial, setSerial] = useState<string | null>(null);

  useEffect(() => {
    setSerial(window.localStorage.getItem(PASS_SERIAL_KEY));
  }, []);

  if (!serial) return null;

  return (
    <div className="global-song-request-badge" aria-label="Song requests">
      <GuestSongRequestPanel serial={serial} />
    </div>
  );
}
