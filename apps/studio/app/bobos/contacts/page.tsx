import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactsBoard } from "@/components/bobos/contacts/ContactsBoard";
import type { ContactRow } from "@/lib/retroverse-pass/contacts";
import { searchContacts } from "@/lib/retroverse-pass/contacts";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import "../../ops/ops.css";
import "./contacts.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contacts — BobOS", robots: { index: false, follow: false } };

export default async function ContactsPage() {
  if (!isOpsEnabled()) notFound();
  let contacts: ContactRow[] = [];
  let error: string | undefined;
  try { contacts = await searchContacts(); } catch (err) { error = err instanceof Error ? err.message : String(err); }
  return <main className="ops-page contacts-page"><div className="ops-page__grain" aria-hidden /><div className="ops-page__inner ops-page__inner--wide">
    <header className="ops-topbar"><div><p className="ops-topbar__kicker">RV02-06 · People</p><h1 className="ops-topbar__title">Contacts</h1></div><div className="ops-topbar__meta"><Link className="ops-link" href="/bobos">← Cockpit</Link>{" · "}<Link className="ops-link" href="/bobos/pass-management">Pass Management</Link></div></header>
    <p className="ops-banner contacts-banner">Contacts — Changes save automatically.</p>
    {error ? <p className="ops-banner ops-banner--warn">{error}</p> : null}
    <ContactsBoard initialContacts={contacts} enabled={!error} />
  </div></main>;
}
