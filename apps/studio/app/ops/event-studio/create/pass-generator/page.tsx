import { redirect } from "next/navigation";

/** Legacy pass-generator → BobOS Design Builder (RV02-03). */
export default function LegacyPassGeneratorRedirect() {
  redirect("/bobos/passes");
}
