"use client";

import { useEffect } from "react";

export function SongArveyContext({ title, artist, year }: { title: string; artist: string; year: number | null }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("retroverse:song-context", { detail: { title, artist, year } }));
  }, [artist, title, year]);
  return null;
}
