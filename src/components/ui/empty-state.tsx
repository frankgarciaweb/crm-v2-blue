import * as React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
      style={{
        backgroundColor: '#1E293B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.25rem',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#434655', marginBottom: '1rem' }}>
        {icon}
      </span>
      <h3
        style={{
          fontFamily: 'Geist, Inter, sans-serif',
          fontSize: '16px',
          fontWeight: 600,
          color: '#c3c6d7',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '13px', color: '#64748B', fontFamily: 'Inter, sans-serif', margin: '0 0 1.5rem', maxWidth: '320px' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
