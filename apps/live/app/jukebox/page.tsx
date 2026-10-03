import type { Metadata } from "next";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import { VdjbxBrowseView } from "../components/vdjbx-browse-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Video Jukebox — Retroverse",
  description: "Browse the verified video collections from Retroverse Live.",
};

export default function JukeboxPage() {
  return (
    <Rv2PublicShell className="rv2-jukebox" broadcastChrome={false}>
      <VdjbxBrowseView />
    </Rv2PublicShell>
  );
}
