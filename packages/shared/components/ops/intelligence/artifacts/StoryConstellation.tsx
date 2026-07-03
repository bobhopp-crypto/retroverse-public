import type { ArtifactStudioModel } from "@/lib/ops/intelligence/artifact-view-model";

type Props = { model: ArtifactStudioModel };

export function StoryConstellation({ model }: Props) {
  const stories = model.stories.slice(0, 8);
  const size = 600;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 200;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="intel-artifact-svg"
      role="img"
      aria-label={`Story constellation for ${model.title}`}
    >
      <defs>
        <radialGradient id="constellation-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f1a2e" />
          <stop offset="100%" stopColor="#050810" />
        </radialGradient>
        <filter id="star-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={size} height={size} fill="url(#constellation-bg)" />

      {/* Background stars */}
      {Array.from({ length: 40 }, (_, i) => (
        <circle
          key={`bg-${i}`}
          cx={(i * 97 + 31) % size}
          cy={(i * 73 + 47) % size}
          r={i % 3 === 0 ? 1.5 : 1}
          fill="#fff"
          opacity={0.15 + (i % 5) * 0.08}
        />
      ))}

      {/* Connection lines */}
      {stories.map((_, i) => {
        const angle = (i / Math.max(stories.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        return (
          <line
            key={`line-${i}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#c9a227"
            strokeWidth="1"
            opacity="0.35"
          />
        );
      })}

      {/* Center sun — the song */}
      <circle cx={cx} cy={cy} r="52" fill="#e85d04" stroke="#c9a227" strokeWidth="3" filter="url(#star-glow)" />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">
        {model.title.length > 18 ? `${model.title.slice(0, 16)}…` : model.title}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#ffe" fontSize="10" fontWeight="600" opacity="0.9">
        {model.artist}
      </text>

      {/* Story stars */}
      {stories.map((story, i) => {
        const angle = (i / stories.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const headline = story.headline.length > 28 ? `${story.headline.slice(0, 26)}…` : story.headline;
        const starR = 8 + story.confidence * 8;

        return (
          <g key={story.id}>
            <circle cx={x} cy={y} r={starR + 14} fill="#fff" opacity="0.06" />
            <circle cx={x} cy={y} r={starR} fill="#fff" stroke="#c9a227" strokeWidth="2" filter="url(#star-glow)" />
            <text x={x} y={y + 4} textAnchor="middle" fill="#111" fontSize="9" fontWeight="900">
              {story.rank}
            </text>
            <text
              x={x}
              y={y + starR + 22}
              textAnchor="middle"
              fill="#f4eed8"
              fontSize="10"
              fontWeight="700"
            >
              {headline}
            </text>
          </g>
        );
      })}

      {stories.length === 0 ? (
        <text x={cx} y={cy + 80} textAnchor="middle" fill="#888" fontSize="16">
          No stories in package
        </text>
      ) : null}

      <text x={size - 16} y={size - 12} textAnchor="end" fill="#666" fontSize="10">
        {stories.length} stories · {model.rvtr}
      </text>
    </svg>
  );
}
