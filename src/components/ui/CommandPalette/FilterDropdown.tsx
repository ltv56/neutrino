import React from 'react';

interface FilterDropdownProps {
  position: { top: number; right: number };
  onInsertFilter: (filter: string) => void;
  onClose: () => void;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  position,
  onInsertFilter,
  onClose,
}) => {
  const handleFilterClick = (filter: string) => {
    onInsertFilter(filter);
    onClose();
  };

  return (
    <div
      className="fixed w-64 rounded-lg overflow-auto"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
        maxHeight: '400px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 60,
      }}
    >
      <div className="p-3">
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-primary)' }}>
          Available Filters
        </div>
        <div className="space-y-1 text-xs" style={{ color: 'var(--fg-secondary)' }}>
          <FilterOption onClick={() => handleFilterClick('@doc ')} label="@doc" description="Documents only" />
          <FilterOption onClick={() => handleFilterClick('@note ')} label="@note" description="Notes only" />
          <FilterOption onClick={() => handleFilterClick('@session ')} label="@session" description="Sessions only" />
          <FilterOption onClick={() => handleFilterClick('> ')} label=">" description="Commands mode" />
          <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border)' }}></div>
          <FilterOption onClick={() => handleFilterClick('path:')} label="path:" description="Match path" />
          <FilterOption onClick={() => handleFilterClick('type:')} label="type:" description="Content/note type" />
          <FilterOption onClick={() => handleFilterClick('in:')} label="in:" description="Location filter" />
        </div>
      </div>
    </div>
  );
};

interface FilterOptionProps {
  onClick: () => void;
  label: string;
  description: string;
}

const FilterOption: React.FC<FilterOptionProps> = ({ onClick, label, description }) => (
  <div
    onClick={onClick}
    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--bg-active)] transition-colors"
  >
    <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}>
      {label}
    </kbd>
    <span>{description}</span>
  </div>
);
