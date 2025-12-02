import React from 'react';
import { X } from 'lucide-react';

interface FilterBadgeProps {
  label: string;
  value?: string;
  chipKey: string;
  negate?: boolean;
  onDelete: (chipKey: string, negate?: boolean) => void;
}

export const FilterBadge: React.FC<FilterBadgeProps> = ({
  label,
  value,
  chipKey,
  negate,
  onDelete,
}) => {
  const displayValue = value?.replace(/__QUOTED_\d+__/g, "''");

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium group cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: 'var(--accent-muted)',
        color: 'var(--accent)',
      }}
    >
      {label}
      {displayValue && <span>{displayValue}</span>}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(chipKey, negate);
        }}
        className="hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] rounded-sm transition-colors"
        style={{ marginLeft: '2px' }}
      >
        <X size={12} />
      </button>
    </span>
  );
};
