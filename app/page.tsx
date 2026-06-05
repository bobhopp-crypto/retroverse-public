import { redirect } from "next/navigation";

import { isSundayEventModeEnabled } from "@/lib/sunday-nights/event-mode";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import { HomeDirectory } from "./components/home-directory";

import "./home-directory.css";
import "./home.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (await isSundayEventModeEnabled()) {
    redirect("/sunday-nights");
  }

  const opsEnabled = isOpsEnabled();

  return (
    <main className="home-directory">
      <HomeDirectory opsEnabled={opsEnabled} />
    </main>
  );
}
