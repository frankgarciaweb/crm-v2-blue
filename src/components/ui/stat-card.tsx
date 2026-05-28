interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: { value: string; positive: boolean };
  accent?: 'primary' | 'tertiary' | 'secondary' | 'alert' | 'production';
}

const accentColor = {
  primary:    '#b4c5ff',
  tertiary:   '#4edea3',
  secondary:  '#ffb95f',
  alert:      '#EF4444',
  production: '#3B82F6',
};

export function StatCard({ label, value, icon, trend, accent = 'primary' }: StatCardProps) {
  const color = accentColor[accent];

  return (
    <div
      className="flex flex-col justify-between p-5 transition-colors duration-150"
      style={{
        backgroundColor: '#1E293B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.25rem',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
    >
      <div className="flex items-start justify-between">
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#94A3B8',
          }}
        >
          {label}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color }}>
          {icon}
        </span>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <div
          style={{
            fontFamily: 'Geist, Inter, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color,
            lineHeight: '32px',
          }}
        >
          {value}
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 mt-1"
            style={{
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              color: trend.positive ? '#10B981' : '#EF4444',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {trend.positive ? 'arrow_upward' : 'arrow_downward'}
            </span>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
