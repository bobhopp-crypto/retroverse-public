import type { ArtifactStudioModel } from "@/lib/ops/intelligence/artifact-view-model";

export type LabelKey =
  | "warner_bros"
  | "columbia"
  | "capitol"
  | "atlantic"
  | "motown"
  | "rca"
  | "mca"
  | "epic"
  | "arista"
  | "chrysalis"
  | "retroverse";

const LABEL_PATTERNS: Array<{ key: LabelKey; patterns: RegExp[] }> = [
  { key: "warner_bros", patterns: [/warner\s*bros/i, /\bwb\b/i] },
  { key: "columbia", patterns: [/columbia/i] },
  { key: "capitol", patterns: [/capitol/i] },
  { key: "atlantic", patterns: [/atlantic/i] },
  { key: "motown", patterns: [/motown/i, /tamla/i] },
  { key: "rca", patterns: [/\brca\b/i, /rca victor/i] },
  { key: "mca", patterns: [/\bmca\b/i] },
  { key: "epic", patterns: [/\bepic\b/i] },
  { key: "arista", patterns: [/arista/i] },
  { key: "chrysalis", patterns: [/chrysalis/i] },
];

export function detectLabelKey(label: string | null | undefined): LabelKey {
  if (!label?.trim()) return "retroverse";
  for (const entry of LABEL_PATTERNS) {
    if (entry.patterns.some((p) => p.test(label))) return entry.key;
  }
  return "retroverse";
}

export function labelDisplayName(key: LabelKey, fallback: string | null): string {
  if (key === "retroverse") return "Retroverse Reconstruction";
  return fallback ?? "Record Label";
}

type LabelPalette = {
  outer: string;
  ring: string;
  label: string;
  accent: string;
  text: string;
  mark: string;
};

const PALETTES: Record<LabelKey, LabelPalette> = {
  warner_bros: {
    outer: "#0d0d0d",
    ring: "#c9a227",
    label: "#f5e6a8",
    accent: "#003399",
    text: "#1a1a1a",
    mark: "#003399",
  },
  columbia: {
    outer: "#111",
    ring: "#e8e8e8",
    label: "#f4f4f4",
    accent: "#111",
    text: "#111",
    mark: "#c41e3a",
  },
  capitol: {
    outer: "#1a0505",
    ring: "#ff6b35",
    label: "#ffe8d6",
    accent: "#2d0a0a",
    text: "#1a0505",
    mark: "#ff6b35",
  },
  atlantic: {
    outer: "#0a1628",
    ring: "#4a90d9",
    label: "#d4e8ff",
    accent: "#0a1628",
    text: "#0a1628",
    mark: "#4a90d9",
  },
  motown: {
    outer: "#1a0a2e",
    ring: "#c9a227",
    label: "#f0e6ff",
    accent: "#4a148c",
    text: "#1a0a2e",
    mark: "#c9a227",
  },
  rca: {
    outer: "#0a0a0a",
    ring: "#e31c23",
    label: "#fff5f5",
    accent: "#111",
    text: "#111",
    mark: "#e31c23",
  },
  mca: {
    outer: "#0d1a0d",
    ring: "#7cb342",
    label: "#e8f5e9",
    accent: "#1b5e20",
    text: "#0d1a0d",
    mark: "#7cb342",
  },
  epic: {
    outer: "#0a0a14",
    ring: "#ffcc00",
    label: "#fff9e6",
    accent: "#1a1a2e",
    text: "#0a0a14",
    mark: "#ffcc00",
  },
  arista: {
    outer: "#0f0f0f",
    ring: "#b8860b",
    label: "#faf0e6",
    accent: "#2c1810",
    text: "#0f0f0f",
    mark: "#b8860b",
  },
  chrysalis: {
    outer: "#0a140a",
    ring: "#66bb6a",
    label: "#e8f8e8",
    accent: "#1b4332",
    text: "#0a140a",
    mark: "#66bb6a",
  },
  retroverse: {
    outer: "#1a2e2a",
    ring: "#2dd4bf",
    label: "#fef9ef",
    accent: "#e85d04",
    text: "#1a2e2a",
    mark: "#e85d04",
  },
};

const MARK_TEXT: Partial<Record<LabelKey, string>> = {
  warner_bros: "WB",
  columbia: "♪",
  capitol: "★",
  atlantic: "A",
  motown: "M",
  rca: "RCA",
  mca: "MCA",
  epic: "E",
  arista: "A",
  chrysalis: "C",
  retroverse: "RV",
};

type Props = { model: ArtifactStudioModel };

export function RecordLabelCard({ model }: Props) {
  const { title, artist, year, albumTitle } = model;
  const rawLabel = model.intel.label;
  const labelKey = detectLabelKey(rawLabel);
  const label = labelDisplayName(labelKey, rawLabel);
  const catalog = model.intel.catalogNumber ?? model.rvtr;
  const palette = PALETTES[labelKey];
  const mark = MARK_TEXT[labelKey] ?? "♪";
  const gradId = `label-grad-${labelKey}`;

  return (
    <svg
      viewBox="0 0 520 520"
      className="intel-artifact-svg song-sheet__artifact"
      role="img"
      aria-label={`Record label for ${title}`}
    >
      <defs>
        <radialGradient id={`${gradId}-groove`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="70%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.label} />
          <stop offset="100%" stopColor={palette.ring} />
        </radialGradient>
      </defs>

      <rect width="520" height="520" fill={palette.outer} />
      <rect x="16" y="16" width="488" height="488" fill="none" stroke={palette.ring} strokeWidth="3" />

      <circle cx="260" cy="248" r="195" fill={`url(#${gradId}-groove)`} stroke="#222" strokeWidth="2" />
      {[170, 150, 130, 110, 90].map((r) => (
        <circle key={r} cx="260" cy="248" r={r} fill="none" stroke="#1f1f1f" strokeWidth="1" />
      ))}

      <circle cx="260" cy="248" r="78" fill={`url(#${gradId})`} stroke={palette.ring} strokeWidth="2" />
      <circle cx="260" cy="248" r="72" fill="none" stroke="#fff" strokeWidth="1" opacity="0.45" />

      {labelKey === "warner_bros" && (
        <path
          d="M260 198 L278 228 L248 228 Z M260 298 L242 268 L278 268 Z"
          fill={palette.mark}
          stroke={palette.accent}
          strokeWidth="1"
        />
      )}

      <text
        x="260"
        y="252"
        textAnchor="middle"
        fill={palette.mark}
        fontSize={mark.length > 2 ? 16 : 22}
        fontWeight="900"
        fontFamily="Georgia, serif"
      >
        {mark}
      </text>

      <text x="260" y="36" textAnchor="middle" fill={palette.ring} fontSize="14" fontWeight="800" letterSpacing="2">
        {label.length > 28 ? `${label.slice(0, 26)}…` : label.toUpperCase()}
      </text>
      <text x="260" y="58" textAnchor="middle" fill="#999" fontSize="11" fontWeight="600">
        CAT. {catalog}
      </text>

      <text
        x="260"
        y="255"
        textAnchor="middle"
        fill={palette.text}
        fontSize="10"
        fontWeight="800"
        transform="rotate(-20 260 248)"
      >
        {artist.toUpperCase().slice(0, 24)}
      </text>

      <circle cx="260" cy="248" r="10" fill={palette.outer} stroke="#333" strokeWidth="2" />

      <rect x="40" y="420" width="440" height="76" fill={palette.accent} stroke={palette.ring} strokeWidth="2" />
      <text x="260" y="452" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">
        {title.length > 32 ? `${title.slice(0, 30)}…` : title}
      </text>
      <text x="260" y="478" textAnchor="middle" fill={palette.ring} fontSize="13" fontWeight="700">
        {albumTitle ?? "Single"} · {year ?? "—"}
      </text>
    </svg>
  );
}
