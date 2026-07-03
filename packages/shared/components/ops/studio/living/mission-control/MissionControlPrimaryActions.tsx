import Link from "next/link";

import { MISSION_CONTROL_ACTIONS } from "@/lib/ops/studio/living/mission-control-copy";

export function MissionControlPrimaryActions() {
  const primary = MISSION_CONTROL_ACTIONS.filter((a) => a.primary);
  const secondary = MISSION_CONTROL_ACTIONS.filter((a) => !a.primary);

  return (
    <section className="rs-mc-actions" aria-label="What to do next">
      <h2 className="rs-mc-section-title">What should I do next?</h2>
      <div className="rs-mc-actions__primary">
        {primary.map((action) => (
          <Link key={action.id} href={action.href} className="rs-mc-action rs-mc-action--primary">
            <span className="rs-mc-action__title">{action.title}</span>
            <span className="rs-mc-action__desc">{action.description}</span>
          </Link>
        ))}
      </div>
      <div className="rs-mc-actions__secondary">
        {secondary.map((action) => (
          <Link key={action.id} href={action.href} className="rs-mc-action rs-mc-action--secondary">
            <span className="rs-mc-action__title">{action.title}</span>
            <span className="rs-mc-action__desc">{action.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
