import Link from "next/link";

import { GIVEAWAY_STUDIO_NAV } from "@/lib/ops/event-studio/giveaway/nav";
import type { GiveawayStudioSection } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  active: GiveawayStudioSection;
  prizeTitle: string;
  status: string;
};

export function GiveawayStudioNav({ active, prizeTitle, status }: Props) {
  return (
    <div className="es-giveaway-nav-wrap">
      <div className="es-giveaway-nav-head">
        <p className="es-giveaway-nav-kicker">Giveaway Studio</p>
        <h2 className="es-giveaway-nav-title">{prizeTitle}</h2>
        <span className={`es-giveaway-nav-status es-giveaway-nav-status--${status}`}>{status}</span>
      </div>
      <nav className="es-giveaway-nav" aria-label="Giveaway Studio">
        {GIVEAWAY_STUDIO_NAV.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active === item.id ? "page" : undefined}
            className={
              active === item.id ? "es-giveaway-nav__link es-giveaway-nav__link--active" : "es-giveaway-nav__link"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
