import { describe, expect, it } from "vitest";

import { pickAvailableId, type Experience } from "./types";

function exp(id: Experience["id"], available: boolean): Experience {
  return {
    id,
    name: id,
    available,
    payload: { rvba: null, broadcast: null },
  };
}

describe("pickAvailableId", () => {
  it("keeps preferred when available", () => {
    const experiences = [
      exp("program", true),
      exp("virtualdj", true),
      exp("announcement", true),
      exp("giveaway", true),
    ];
    expect(pickAvailableId(experiences, "virtualdj")).toBe("virtualdj");
  });

  it("fails over by priority when preferred is unavailable", () => {
    const experiences = [
      exp("program", false),
      exp("virtualdj", false),
      exp("announcement", true),
      exp("giveaway", true),
    ];
    expect(pickAvailableId(experiences, "virtualdj")).toBe("announcement");
  });

  it("returns null when nothing is available", () => {
    const experiences = [
      exp("program", false),
      exp("virtualdj", false),
      exp("announcement", false),
      exp("giveaway", false),
    ];
    expect(pickAvailableId(experiences, "program")).toBeNull();
  });
});
