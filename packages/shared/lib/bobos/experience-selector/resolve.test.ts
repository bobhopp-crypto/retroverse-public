import { describe, expect, it } from "vitest";

import {
  currentExperienceStageKey,
  experiencePayloadFromPlayhead,
  playheadFromExperience,
} from "./current-experience";
import { pickAvailableId, type Experience } from "./types";

function exp(id: Experience["id"], available: boolean): Experience {
  return {
    id,
    name: id,
    available,
    payload: {
      rvba: {
        id: `${id}-rvba`,
        type: "slide",
        title: `${id} title`,
        subtitle: "Retroverse",
        body: "",
        link: null,
        mediaUrl: null,
        mediaWidth: null,
        mediaHeight: null,
      },
      broadcast: {
        id: `${id}-broadcast`,
        type: "slide",
        state: "playing",
        title: `${id} title`,
        subtitle: "Retroverse",
        duration: 45,
        elapsedSeconds: 0,
        updatedAt: "2026-07-22T00:00:00.000Z",
      },
    },
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

describe("one current experience payload", () => {
  it("derives the website contract from the canonical playhead", () => {
    const experience = exp("program", true);
    const currentExperience = playheadFromExperience(experience, new Date("2026-07-22T00:00:00.000Z"));
    const payload = experiencePayloadFromPlayhead(currentExperience);

    expect(payload.rvba?.id).toBe("program-rvba");
    expect(payload.broadcast?.id).toBe("program-broadcast");
    expect(currentExperienceStageKey(currentExperience)).toContain("program title");
  });

  it("uses the same rvba and broadcast objects on the playhead slice", () => {
    const experience = exp("virtualdj", true);
    const currentExperience = playheadFromExperience(experience);
    const payload = experiencePayloadFromPlayhead(currentExperience);

    expect(payload.rvba).toBe(currentExperience.rvba);
    expect(payload.broadcast).toBe(currentExperience.broadcast);
  });
});
