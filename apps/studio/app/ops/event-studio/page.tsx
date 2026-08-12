import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function EventStudioOverviewPage() {
  // RV02-06 hub entry → canonical BobOS Producer (RV02-02).
  redirect("/bobos/producer");
}
