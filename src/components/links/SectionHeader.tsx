import React, { memo } from 'react';

interface SectionHeaderProps {
  title: string;
  count: number;
  borderBottom?: boolean;
  borderTop?: boolean;
}

export const SectionHeader = memo<SectionHeaderProps>(
  ({ title, count, borderBottom, borderTop }) => (
    <div
      className="px-3 py-1.5 font-medium"
      style={{
        color: 'var(--fg-primary)',
        backgroundColor: 'var(--bg-secondary)',
        ...(borderTop && { borderTop: '1px solid var(--border-light)' }),
        ...(borderBottom && { borderBottom: '1px solid var(--border-light)' }),
        boxShadow: '0 3px 20px rgba(0, 0, 0, 0.18)',
        fontSize: '13px',
        zIndex: borderTop ? 20 : 10
      }}
    >
      {title} ({count})
    </div>
  )
);
