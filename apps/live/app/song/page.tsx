import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Song — Retroverse",
};

/** Retired renderer demo route; public discovery stays in the Explorer. */
export default function SongIndexPage() {
  redirect("/search");
}
