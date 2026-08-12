import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** RV02-04 retired — operator work lives in Pass Management (RV02-05). */
export default function BobosPassRegistrationRedirectPage() {
  redirect("/bobos/pass-management");
}
