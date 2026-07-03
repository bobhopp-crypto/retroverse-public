import type { ArtifactStudioModel } from "@/lib/ops/intelligence/artifact-view-model";

type Props = { model: ArtifactStudioModel };

export function SongDNACard({ model }: Props) {
  const m = model.metrics;
  const width = 520;
  const height = 440;
  const pairs = [
    { left: "Sources", right: String(m.sources), color: "#2a9d8f" },
    { left: "Stories", right: String(m.stories), color: "#e85d04" },
    { left: "Recording", right: String(m.recording), color: "#003399" },
    { left: "Video", right: String(m.video), color: "#c9a227" },
    { left: "Chart", right: m.chartPeak != null ? `#${m.chartPeak}` : "—", color: "#111" },
    { left: "Quotes", right: String(m.quotes), color: "#6a4c93" },
  ];

  const helixX = 360;
  const startY = 70;
  const stepY = 52;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="intel-artifact-svg"
      role="img"
      aria-label={`Song DNA for ${model.title}`}
    >
      <rect width={width} height={height} fill="#fff" stroke="#111" strokeWidth="3" />

      <text x={24} y={36} fill="#111" fontSize="24" fontWeight="800">
        Song DNA
      </text>
      <text x={24} y={58} fill="#444" fontSize="13" fontWeight="600">
        {model.title} · {model.artist}
      </text>

      {/* Metric rows */}
      {pairs.map((pair, i) => {
        const y = 88 + i * 44;
        const barW = Math.min(100, 20 + Number.parseInt(pair.right, 10) * 12 || 30);
        return (
          <g key={pair.left}>
            <text x={24} y={y + 14} fill="#111" fontSize="13" fontWeight="800">
              {pair.left}
            </text>
            <rect x={120} y={y} width={barW} height={22} fill={pair.color} stroke="#111" strokeWidth="1.5" rx="2" />
            <text x={120 + barW + 10} y={y + 16} fill="#111" fontSize="13" fontWeight="700">
              {pair.right}
            </text>
          </g>
        );
      })}

      {/* DNA helix */}
      {pairs.map((pair, i) => {
        const y = startY + i * stepY;
        const offset = i % 2 === 0 ? -28 : 28;
        return (
          <g key={`helix-${pair.left}`}>
            <line
              x1={helixX + offset}
              y1={y}
              x2={helixX - offset}
              y2={y + stepY * 0.5}
              stroke={pair.color}
              strokeWidth="3"
              opacity="0.7"
            />
            <circle cx={helixX + offset} cy={y} r="7" fill={pair.color} stroke="#111" strokeWidth="1.5" />
            <circle
              cx={helixX - offset}
              cy={y + stepY * 0.5}
              r="7"
              fill="#fff"
              stroke={pair.color}
              strokeWidth="2"
            />
          </g>
        );
      })}

      <path
        d={`M ${helixX} ${startY - 10} Q ${helixX + 40} ${height / 2} ${helixX} ${height - 40}`}
        fill="none"
        stroke="#111"
        strokeWidth="1"
        opacity="0.15"
      />

      <text x={24} y={height - 16} fill="#666" fontSize="10">
        Confidence {m.confidence}% · {model.rvtr}
      </text>
    </svg>
  );
}
