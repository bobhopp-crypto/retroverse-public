import { redirect } from "next/navigation";

/** Legacy route — library is now the Content Creator home. */
export default function GenerationsRedirectPage() {
  redirect("/ops/content-creator");
}
