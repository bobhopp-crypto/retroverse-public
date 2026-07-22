import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy collector door list — redirected to BobOS Pass Management. */
export default function OpsPassRegistrationsRedirectPage() {
  redirect("/bobos/pass-management");
}
