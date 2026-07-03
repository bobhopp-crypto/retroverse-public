const COUNT_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
] as const;

export function formatMonthYearTitle(year: number, month: number): string {
  const safeMonth = month >= 1 && month <= 12 ? month - 1 : 0;
  const safeYear = Number.isFinite(year) ? year : 1970;
  const d = new Date(safeYear, safeMonth, 1);
  const mon = d.toLocaleString("en-US", { month: "long" });
  return `${mon} ${safeYear}`;
}

export function monthRecordsDefinedCopy(totalRecords: number): string {
  if (totalRecords <= 0) return "Quiet month on the airwaves";
  const word =
    totalRecords >= 0 && totalRecords < COUNT_WORDS.length
      ? COUNT_WORDS[totalRecords]!
      : String(totalRecords);
  const noun = totalRecords === 1 ? "record" : "records";
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} ${noun} defined the month`;
}
