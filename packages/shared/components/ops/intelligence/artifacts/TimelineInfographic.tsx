import type { ArtifactStudioModel } from "@/lib/ops/intelligence/artifact-view-model";

type Props = { model: ArtifactStudioModel };

function wrap(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function TimelineInfographic({ model }: Props) {
  const events = model.intel.timelineEvents.slice(0, 7);
  const width = 900;
  const height = 360;
  const padX = 56;
  const axisY = 200;

  if (events.length === 0) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="intel-artifact-svg">
        <rect width={width} height={height} fill="#fff" stroke="#111" strokeWidth="3" />
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#666" fontSize="18">
          No timeline events in package
        </text>
      </svg>
    );
  }

  const step = events.length > 1 ? (width - padX * 2) / (events.length - 1) : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="intel-artifact-svg"
      role="img"
      aria-label={`Timeline for ${model.title}`}
    >
      <rect width={width} height={height} fill="#faf8f2" stroke="#111" strokeWidth="3" />
      <text x={padX} y={40} fill="#111" fontSize="26" fontWeight="800">
        {model.title}
      </text>
      <text x={padX} y={64} fill="#2a9d8f" fontSize="14" fontWeight="700">
        {model.artist} · Timeline
      </text>

      <line x1={padX} y1={axisY} x2={width - padX} y2={axisY} stroke="#111" strokeWidth="5" strokeLinecap="round" />

      {events.map((event, i) => {
        const x = padX + step * i;
        const above = i % 2 === 0;
        const cardY = above ? 78 : 228;
        const stemY2 = above ? axisY - 24 : axisY + 24;

        return (
          <g key={event.id}>
            <line x1={x} y1={axisY} x2={x} y2={stemY2} stroke="#e85d04" strokeWidth="3" />
            <circle cx={x} cy={axisY} r="12" fill="#e85d04" stroke="#111" strokeWidth="2" />
            <text x={x} y={axisY + 5} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800">
              {i + 1}
            </text>

            <rect
              x={x - 72}
              y={cardY}
              width="144"
              height="88"
              fill="#fff"
              stroke="#111"
              strokeWidth="2"
              rx="4"
            />
            <text x={x} y={cardY + 22} textAnchor="middle" fill="#003399" fontSize="16" fontWeight="900">
              {event.year ?? "—"}
            </text>
            <text x={x} y={cardY + 42} textAnchor="middle" fill="#111" fontSize="12" fontWeight="800">
              {wrap(event.title, 20)}
            </text>
            <text x={x} y={cardY + 58} textAnchor="middle" fill="#444" fontSize="9" fontWeight="500">
              {wrap(event.description, 42)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
