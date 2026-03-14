interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  tone?: 'green' | 'amber' | 'red' | 'blue';
}

export function StatCard({ label, value, helper, tone = 'blue' }: StatCardProps) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-helper">{helper}</span>
    </div>
  );
}
