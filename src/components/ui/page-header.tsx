import * as React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div
      className="flex items-start justify-between mb-6"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#b4c5ff' }}>
            {icon}
          </span>
        )}
        <div>
          <h1
            style={{
              fontFamily: 'Geist, Inter, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              color: '#F8FAFC',
              margin: 0,
              lineHeight: '28px',
            }}
          >
            {title}
          </h1>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
