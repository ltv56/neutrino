import React from 'react';

interface CommandItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  isSelected: boolean;
  onClick: () => void;
}

export const CommandItem: React.FC<CommandItemProps> = ({
  icon,
  title,
  subtitle,
  isSelected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
      style={{
        backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
        paddingTop: subtitle ? '6px' : '15px',
        paddingBottom: subtitle ? '6px' : '15px',
      }}
    >
      <div className="flex-shrink-0" style={{ color: 'var(--accent)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-primary)' }}>
          {title}
        </div>
        {subtitle && (
          <div className="text-xs truncate mt-0.5" style={{ color: 'var(--fg-secondary)' }}>
            {subtitle}
          </div>
        )}
      </div>
      <kbd
        className="px-1.5 py-0.5 rounded text-xs font-medium"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--fg-secondary)',
          opacity: isSelected ? 1 : 0,
        }}
      >
        ↵
      </kbd>
    </div>
  );
};
