import * as React from 'react';

type SparklineProps = {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  /** Render a soft gradient area under the line. */
  fill?: boolean;
  className?: string;
  strokeWidth?: number;
  /** Animate the line drawing on mount. */
  animate?: boolean;
};

/**
 * Lightweight inline SVG sparkline — no chart library overhead.
 * Used in the institutional stat cards (occupancy, revenue, bookings…).
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = 'hsl(var(--primary))',
  height = 40,
  width = 120,
  fill = true,
  className,
  strokeWidth = 2,
  animate = true,
}) => {
  const gradientId = React.useId();

  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = strokeWidth + 1;
  const usableH = height - pad * 2;

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = pad + usableH - ((d - min) / range) * usableH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          className={animate ? 'spark-fill' : undefined}
        />
      )}
      <path
        d={linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'spark-draw' : undefined}
      />
    </svg>
  );
};

export default Sparkline;
