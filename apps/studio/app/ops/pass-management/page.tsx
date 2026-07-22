import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy ops URL — permanently redirected into BobOS. */
export default function OpsPassManagementRedirectPage() {
  redirect("/bobos/pass-management");
}
