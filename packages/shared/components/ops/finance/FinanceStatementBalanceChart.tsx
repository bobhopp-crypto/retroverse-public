type Point = {
  label: string;
  endingBalance: number;
  statementEnd: string;
};

type Props = {
  points: Point[];
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function FinanceStatementBalanceChart({ points }: Props) {
  if (points.length < 2) return null;

  const width = 640;
  const height = 220;
  const padX = 48;
  const padY = 32;
  const values = points.map((p) => p.endingBalance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (p.endingBalance - min) / span) * (height - padY * 2);
    return { x, y, ...p };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div className="ops-finance-apple__chart-wrap">
      <svg
        className="ops-finance-apple__chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Statement ending balance history"
      >
        <polyline
          fill="none"
          stroke="#1a4d4d"
          strokeWidth="4"
          points={polyline}
        />
        {coords.map((c) => (
          <g key={c.statementEnd}>
            <circle cx={c.x} cy={c.y} r="6" fill="#c45c26" stroke="#1a1a1a" strokeWidth="2" />
            <text x={c.x} y={height - 8} textAnchor="middle" fontSize="12" fill="#333">
              {c.label.replace(" 20", " '")}
            </text>
            <text x={c.x} y={c.y - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a4d4d">
              {fmt(c.endingBalance)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
