import { useMemo, type ReactNode } from "react";

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const DEFAULT_PALETTE = ["#0A0A0A", "#FFFFFF", "#5A5A40", "#78716C", "#D4D4D4"];

export default function PlateVisual({
  seed,
  palette,
  className,
}: {
  seed: number;
  palette: string[];
  className?: string;
}) {
  const shapes = useMemo(() => {
    const r = rng(seed);
    const els: ReactNode[] = [];
    const [ink, paper, a, b, c] =
      palette.length >= 5 ? palette : DEFAULT_PALETTE;
    const cols = [a, b, c, ink, paper];

    els.push(
      <pattern key="grid" id={`grid-${seed}`} width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.5" fill={ink} opacity="0.04" />
      </pattern>,
    );
    els.push(<rect key="bg-grid" width="100" height="140" fill={`url(#grid-${seed})`} />);

    const n = 6 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const kind = r();
      const col = cols[Math.floor(r() * cols.length)];
      const opacity = 0.25 + r() * 0.55;
      const x = r() * 100;
      const y = r() * 140;

      if (kind < 0.3) {
        const w = 12 + r() * 38;
        const h = 10 + r() * 50;
        const rot = (r() - 0.5) * 12;
        els.push(
          <rect
            key={`b${i}`}
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            fill={col}
            opacity={opacity}
            transform={`rotate(${rot}, ${x}, ${y})`}
          />,
        );
      } else if (kind < 0.5) {
        const rad = 6 + r() * 28;
        const stroke = r() > 0.5;
        els.push(
          <circle
            key={`c${i}`}
            cx={x}
            cy={y}
            r={rad}
            fill={stroke ? "none" : col}
            stroke={stroke ? col : "none"}
            strokeWidth={stroke ? 0.5 + r() * 1.2 : 0}
            opacity={opacity}
          />,
        );
      } else if (kind < 0.7) {
        const rad = 8 + r() * 30;
        const startAngle = r() * Math.PI * 2;
        const endAngle = startAngle + 0.5 + r() * 2.5;
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        const x1 = x + Math.cos(startAngle) * rad;
        const y1 = y + Math.sin(startAngle) * rad;
        const x2 = x + Math.cos(endAngle) * rad;
        const y2 = y + Math.sin(endAngle) * rad;
        els.push(
          <path
            key={`a${i}`}
            d={`M ${x1} ${y1} A ${rad} ${rad} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={col}
            strokeWidth={0.6 + r() * 1.4}
            opacity={opacity}
            strokeLinecap="round"
          />,
        );
      } else if (kind < 0.85) {
        const x2 = x + (r() - 0.5) * 80;
        const y2 = y + (r() - 0.5) * 100;
        els.push(
          <line
            key={`l${i}`}
            x1={x}
            y1={y}
            x2={x2}
            y2={y2}
            stroke={col}
            strokeWidth={0.3 + r() * 1.0}
            opacity={opacity * 0.8}
          />,
        );
      } else {
        for (let j = 0; j < 3 + Math.floor(r() * 5); j++) {
          const dx = x + (r() - 0.5) * 20;
          const dy = y + (r() - 0.5) * 20;
          els.push(
            <circle
              key={`d${i}-${j}`}
              cx={dx}
              cy={dy}
              r={0.8 + r() * 2.5}
              fill={col}
              opacity={opacity * 0.7}
            />,
          );
        }
      }
    }

    const hy = 20 + r() * 100;
    els.push(
      <line
        key="h1"
        x1={6}
        y1={hy}
        x2={94}
        y2={hy + (r() - 0.5) * 6}
        stroke={ink}
        strokeWidth={0.4}
        opacity={0.6}
      />,
    );
    if (r() > 0.5) {
      els.push(
        <line
          key="h2"
          x1={10}
          y1={hy + 4}
          x2={40}
          y2={hy + 4}
          stroke={ink}
          strokeWidth={0.25}
          opacity={0.35}
        />,
      );
    }

    els.push(
      <rect
        key="frame"
        x="2"
        y="2"
        width="96"
        height="136"
        fill="none"
        stroke={ink}
        strokeWidth="0.3"
        opacity="0.15"
      />,
    );

    return { els, bg: paper };
  }, [seed, palette]);

  return (
    <svg
      viewBox="0 0 100 140"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Abstract plate"
    >
      <rect width="100" height="140" fill={shapes.bg} />
      {shapes.els}
    </svg>
  );
}
