interface Point {
  price: number | null;
  observedAt: string;
}

interface SparklineProps {
  points: Point[];
}

/** Minimal SVG price chart; no external chart dependency. */
export function PriceSparkline({ points }: SparklineProps) {
  const values = points
    .filter((point): point is Point & { price: number } => point.price !== null)
    .slice()
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());

  if (values.length < 2) {
    return <p className="muted small">Chưa đủ dữ liệu để vẽ biểu đồ ({values.length} lần ghi).</p>;
  }

  const width = 260;
  const height = 64;
  const prices = values.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;

  const coords = values.map((point, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((point.price - min) / span) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = values[values.length - 1]!;
  const first = values[0]!;
  const delta = last.price - first.price;

  return (
    <div className="sparkline">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ lịch sử giá">
        <polyline points={coords.join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx={width} cy={coords[coords.length - 1]!.split(",")[1]} r="3" fill="currentColor" />
      </svg>
      <p className="muted small">
        {values.length} lần ghi · {delta === 0 ? "không đổi" : delta < 0 ? `giảm ${formatDelta(-delta)}` : `tăng ${formatDelta(delta)}`}
      </p>
    </div>
  );
}

function formatDelta(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
