import { redirect } from "next/navigation";

/**
 * Studio has no public homepage. Dev rewrite used to proxy `/` to Live, but that
 * hydrates under the Studio shell and crashes the client
 * ("Cannot read properties of undefined (reading 'call')").
 * Cockpit is the Studio entrypoint.
 */
export default function StudioRootPage() {
  redirect("/bobos");
}
