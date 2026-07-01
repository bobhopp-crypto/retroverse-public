import Link from "next/link";

type Props = {
  venue: string;
  registrationHref: string;
};

export function EventHomepageFooter({ venue, registrationHref }: Props) {
  return (
    <footer className="event-footer">
      <nav className="event-footer__nav" aria-label="Event footer">
        <Link href="/">Retroverse</Link>
        <span className="event-footer__sep" aria-hidden>
          ·
        </span>
        <span>{venue}</span>
        <span className="event-footer__sep" aria-hidden>
          ·
        </span>
        <Link href={registrationHref}>Registration</Link>
        <span className="event-footer__sep" aria-hidden>
          ·
        </span>
        <Link href="/rv/1985">Archive</Link>
      </nav>
    </footer>
  );
}
