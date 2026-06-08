export type PassStyle = "Festival Pass" | "Guest Pass" | "VIP Pass" | "Staff Pass";

export const PASS_STYLES: PassStyle[] = [
  "Festival Pass",
  "Guest Pass",
  "VIP Pass",
  "Staff Pass",
];

export type PassArchiveEntry = {
  title: string;
  venue: string;
  date: string;
  years: string;
  style: string;
  createdAt: string;
};

export type PassArchiveFile = {
  version: 1;
  entries: PassArchiveEntry[];
};

export type PassGeneratorForm = {
  title: string;
  venue: string;
  date: string;
  years: string;
  quantity: number;
  style: PassStyle;
};

export type PassDisplayData = {
  yearsLine: string;
  titleLine: string;
  dateLine: string;
  venueLines: string[];
  styleLine: string;
};
