/** Curated spotlight facts for preserved players (expand as archive grows). */
const FACTS: Record<string, { era: string; fact: string }> = {
  "ROGER MARIS": {
    era: "1960s · New York Yankees",
    fact: "Broke Babe Ruth's single-season home run record with 61 HR in 1961.",
  },
  "MICKEY MANTLE": {
    era: "1950s–60s · New York Yankees",
    fact: "Switch-hitting icon who patrolled center field during the Yankees dynasty.",
  },
  "HANK AARON": {
    era: "1950s–70s · Milwaukee/Atlanta Braves",
    fact: "Passed Babe Ruth on the all-time home run list with his 715th homer in 1974.",
  },
  "WILLIE MAYS": {
    era: "1950s–70s · New York/San Francisco Giants",
    fact: "The Say Hey Kid — 660 career home runs and one of baseball's greatest center fielders.",
  },
  "ROBERTO CLEMENTE": {
    era: "1950s–70s · Pittsburgh Pirates",
    fact: "First Latin American player inducted into the Hall of Fame; 3,000-hit club member.",
  },
  "JOE DIMAGGIO": {
    era: "1930s–50s · New York Yankees",
    fact: "Hit in 56 consecutive games — a record that still stands.",
  },
};

export function playerSpotlightMeta(player: string): { era: string; fact: string } {
  const key = player.trim().toUpperCase();
  return (
    FACTS[key] ?? {
      era: "Cadaco All-Star Baseball era",
      fact: "Disc probabilities reconstructed from vintage scan geometry and OCR.",
    }
  );
}
