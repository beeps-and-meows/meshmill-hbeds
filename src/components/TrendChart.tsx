import type { HistoricalPoint } from '../lib/data';

interface TrendChartProps {
  data: HistoricalPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  const maxBeds = Math.max(...data.map((d) => d.availableBeds));
  const minBeds = Math.min(...data.map((d) => d.availableBeds));
  const maxBoarders = Math.max(...data.map((d) => d.edBoarders));
  const width = 520;
  const height = 180;
  const padding = 24;

  const bedPoints = data
    .map((item, index) => {
      const x = padding + (index * (width - padding * 2)) / (data.length - 1);
      const y = padding + ((maxBeds - item.availableBeds) * (height - padding * 2)) / Math.max(1, maxBeds - minBeds);
      return `${x},${y}`;
    })
    .join(' ');

  const boarderPoints = data
    .map((item, index) => {
      const x = padding + (index * (width - padding * 2)) / (data.length - 1);
      const y = height - padding - (item.edBoarders * (height - padding * 2)) / maxBoarders;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="chart-card">
      <div className="section-head compact">
        <div>
          <h3>Historical Availability</h3>
          <p>Download-ready trend line for statewide operations and after-action reporting.</p>
        </div>
        <div className="legend-group">
          <span><i className="legend-dot blue" /> Available beds</span>
          <span><i className="legend-dot amber" /> ED boarders</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Historical capacity trend">
        <polyline fill="none" stroke="var(--blue)" strokeWidth="4" points={bedPoints} />
        <polyline fill="none" stroke="var(--amber)" strokeWidth="4" strokeDasharray="8 6" points={boarderPoints} />
        {data.map((item, index) => {
          const x = padding + (index * (width - padding * 2)) / (data.length - 1);
          return (
            <g key={item.time}>
              <line x1={x} x2={x} y1={height - 16} y2={height - 22} stroke="var(--border-strong)" />
              <text x={x} y={height - 4} textAnchor="middle" className="chart-label">
                {item.time}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
