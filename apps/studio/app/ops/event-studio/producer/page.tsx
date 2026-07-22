import { redirect } from "next/navigation";

/** Legacy Event Studio producer → BobOS Event Producer (RV02-02). */
export default function LegacyEventStudioProducerRedirect() {
  redirect("/bobos/producer");
}
