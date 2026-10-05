import type { Metadata } from "next";

import { VdjbxGuestJukebox } from "../components/vdjbx-guest-jukebox";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Guest Jukebox — Retroverse Live",
  description: "Browse the songs available on the Retroverse Live stage.",
};

export default function JukeboxPage() {
  return <VdjbxGuestJukebox />;
}
