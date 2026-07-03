export const SET_COLOR_IDS = ["green", "blue", "orange", "purple", "yellow"] as const;

export type SetColorId = (typeof SET_COLOR_IDS)[number];

export type SetColorStyle = {
  id: SetColorId;
  label: string;
  bg: string;
  border: string;
  ink: string;
};

/** Bob-assigned set colors — distinct from AI cluster palette. */
export const SET_COLORS: Record<SetColorId, SetColorStyle> = {
  green: { id: "green", label: "Green", bg: "#2ecc71", border: "#1f8f4a", ink: "#141210" },
  blue: { id: "blue", label: "Blue", bg: "#3b9eff", border: "#1d4ed8", ink: "#141210" },
  orange: { id: "orange", label: "Orange", bg: "#ff9f43", border: "#c2410c", ink: "#141210" },
  purple: { id: "purple", label: "Purple", bg: "#a855f7", border: "#6b21a8", ink: "#ffffff" },
  yellow: { id: "yellow", label: "Yellow", bg: "#f0b429", border: "#92600a", ink: "#141210" },
};

export function parseSetColorId(value: unknown): SetColorId {
  if (typeof value === "string" && SET_COLOR_IDS.includes(value as SetColorId)) {
    return value as SetColorId;
  }
  return "green";
}

export function defaultSetColor(index: number): SetColorId {
  return SET_COLOR_IDS[index % SET_COLOR_IDS.length]!;
}
