import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SongRequestsPage() {
  redirect("/bobos/jukebox");
}
