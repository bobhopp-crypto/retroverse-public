import Link from "next/link";

import type { WorkshopRoom } from "@/lib/atlas/types";

const ROOM_GLYPH: Record<string, string> = {
  shelf: "▣",
  missions: "◎",
  prep: "♪",
  event: "✦",
  create: "✎",
  surgery: "⚙",
};

type Props = {
  rooms: WorkshopRoom[];
};

export function WorkshopBoard({ rooms }: Props) {
  return (
    <div className="atlas-workshop">
      <header className="atlas-workshop__head">
        <p className="atlas-kicker">Backstage</p>
        <h1 className="atlas-workshop__title">The Workshop</h1>
        <p className="atlas-workshop__sub">Six rooms · curator tools</p>
      </header>

      <div className="atlas-workshop__grid">
        {rooms.map((room) => (
          <article key={room.id} className={`atlas-room atlas-room--${room.tone}`}>
            <div className="atlas-room__head">
              <span className="atlas-room__glyph" aria-hidden>
                {ROOM_GLYPH[room.tone] ?? "▣"}
              </span>
              <div>
                <h2 className="atlas-room__title">{room.title}</h2>
                <p className="atlas-room__status">{room.status}</p>
              </div>
            </div>
            <ul className="atlas-room__tools">
              {room.tools.map((tool) => (
                <li key={tool.href}>
                  <Link href={tool.href} className="atlas-room__link" prefetch={false}>
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
