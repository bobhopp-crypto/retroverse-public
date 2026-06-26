import type { ChartJourneyModel } from "./types";

import { buildChartJourneyOpening } from "./chart-archetype";

function describeClimb(
  weeks: ChartJourneyModel["runs"][number]["weeks"],
  peakIndex: number,
): string {
  if (peakIndex <= 0) return "held its opening position";

  let totalGain = 0;
  let improving = 0;
  let biggestJump = 0;

  for (let index = 1; index <= peakIndex; index += 1) {
    const week = weeks[index]!;
    const previous = weeks[index - 1]!;
    const move = previous.rank - week.rank;
    if (move > 0) {
      totalGain += move;
      improving += 1;
      biggestJump = Math.max(biggestJump, move);
    }
  }

  const avg = improving > 0 ? totalGain / improving : 0;
  if (biggestJump >= 15 || avg >= 8) return "exploded upward";
  if (avg >= 4) return "climbed rapidly";
  if (avg >= 1.5) return "climbed steadily";
  return "edged upward";
}

function describeDecline(weeks: ChartJourneyModel["runs"][number]["weeks"], fromIndex: number): string {
  const tail = weeks.slice(fromIndex + 1);
  if (tail.length === 0) return "";

  let totalDrop = 0;
  let falling = 0;
  for (let index = fromIndex + 1; index < weeks.length; index += 1) {
    const week = weeks[index]!;
    const previous = weeks[index - 1]!;
    const move = previous.rank - week.rank;
    if (move < 0) {
      totalDrop += Math.abs(move);
      falling += 1;
    }
  }

  if (falling === 0) return " and drifted down the chart";
  const avg = totalDrop / falling;
  if (avg >= 6) return " and fell quickly";
  if (avg >= 3) return " and slid down the chart";
  return " before fading from the chart";
}

function describeRun(run: ChartJourneyModel["runs"][number]): string {
  const weeks = run.weeks;
  if (weeks.length === 0) return "";

  const debutRank = weeks[0]!.rank;
  const peakRank = run.peakRank;
  const peakWeekIndex = weeks.findIndex((week) => week.rank === peakRank);
  const weeksToPeak = peakWeekIndex >= 0 ? peakWeekIndex + 1 : weeks.length;
  const weeksAtOne = weeks.filter((week) => week.rank === 1).length;
  const weeksInTop10 = weeks.filter((week) => week.rank <= 10).length;

  if (run.reentry) {
    const absent = run.weeksAbsent;
    const lead =
      absent > 0
        ? `Returned after ${absent} week${absent === 1 ? "" : "s"} off the chart at #${debutRank}`
        : `Returned to the chart at #${debutRank}`;
    if (weeks.length === 1) return `${lead}.`;
    if (peakRank === debutRank) {
      return `${lead}, charting ${weeks.length} more weeks at that level.`;
    }
    return `${lead}, reaching #${peakRank} over ${weeks.length} more weeks.`;
  }

  if (weeks.length === 1) {
    return `Entered at #${debutRank} and left after one week.`;
  }

  let sentence = `Entered at #${debutRank}`;

  if (peakRank === debutRank) {
    sentence += ` at its peak`;
  } else if (weeksToPeak === 1) {
    sentence += ` and reached #${peakRank} immediately`;
  } else {
    sentence += `, ${describeClimb(weeks, peakWeekIndex)} for ${weeksToPeak} weeks to reach #${peakRank}`;
  }

  if (weeksAtOne > 0) {
    sentence += `, stayed at #1 for ${weeksAtOne} week${weeksAtOne === 1 ? "" : "s"}`;
  } else if (peakRank <= 10 && weeksInTop10 > 1) {
    sentence += `, then spent ${weeksInTop10} weeks inside the Top 10`;
  }

  const afterPeakIndex = peakWeekIndex >= 0 ? peakWeekIndex : 0;
  const weeksAfterPeak = weeks.length - afterPeakIndex - 1;
  if (weeksAfterPeak > 0) {
    sentence += describeDecline(weeks, afterPeakIndex);
    if (weeksAfterPeak <= 3) {
      sentence += ` over ${weeksAfterPeak} more week${weeksAfterPeak === 1 ? "" : "s"}`;
    }
  }

  sentence += ` across ${weeks.length} weeks on the chart`;
  return `${sentence}.`;
}

/** Narrative summary: archetype opening + detailed run description. */
export function buildChartJourneyStory(model: ChartJourneyModel): string {
  const { runs, metrics } = model;
  if (runs.length === 0) return "";

  const opening = buildChartJourneyOpening(model);

  let body: string;
  if (runs.length === 1) {
    body = describeRun(runs[0]!);
  } else {
    const parts = runs.map((run) => describeRun(run));
    body = `${parts.join(" ")} ${metrics.weeksOnChart} total weeks on chart.`;
  }

  return `${opening} ${body}`;
}

export function buildRowExpandBullets(input: {
  row: ChartJourneyModel["rows"][number];
  model: ChartJourneyModel;
  gap?: { weeksAbsent: number };
  timelineLabels: string[];
}): string[] {
  const { row, model, gap, timelineLabels } = input;
  const { metrics } = model;
  const bullets: string[] = [];
  const { detail, week } = row;

  bullets.push(`Week ${detail.weekNumber} on chart`);

  if (metrics.peakPosition != null && week.rank === metrics.peakPosition) {
    bullets.push(`Peak position (#${week.rank})`);
  } else if (week.peakToDate != null && week.peakToDate === week.rank) {
    bullets.push(`Highest chart position so far (#${week.rank})`);
  }

  if (gap && gap.weeksAbsent > 0) {
    bullets.push(
      `Returned after ${gap.weeksAbsent} week${gap.weeksAbsent === 1 ? "" : "s"} off the chart`,
    );
  } else if (week.reentry || week.movement === "reentry") {
    bullets.push("Returned to the chart this week");
  }

  if (detail.movementFromPrevious != null) {
    if (detail.movementFromPrevious > 0) {
      bullets.push(`Up ${detail.movementFromPrevious} from previous week`);
    } else if (detail.movementFromPrevious < 0) {
      bullets.push(`Down ${Math.abs(detail.movementFromPrevious)} from previous week`);
    } else if (row.weekIndex > 0) {
      bullets.push("Unchanged from previous week");
    }
  } else if (row.weekIndex === 0 || week.movement === "debut") {
    bullets.push(`Chart debut at #${week.rank}`);
  }

  if (detail.weeksRemaining === 0) {
    bullets.push("Final week on chart");
  } else if (detail.weeksRemaining === 1) {
    bullets.push("Left the chart the following week");
  }

  for (const label of timelineLabels) {
    bullets.push(label);
  }

  return bullets;
}
