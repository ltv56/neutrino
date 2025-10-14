import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  prefix?: string;
  placeholder: string;
  onClick: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ prefix, placeholder, onClick }) => {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1 rounded w-full max-w-[400px] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border)',
      }}
      onClick={onClick}
      data-no-drag
    >
      <Search size={14} style={{ color: 'var(--fg-secondary)' }} />
      {prefix && (
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--accent)',
            backgroundColor: 'var(--accent-muted)',
          }}
        >
          {prefix}
        </span>
      )}
      <span className="text-xs flex-1" style={{ color: 'var(--fg-secondary)' }}>
        {placeholder}
      </span>
      <span
        className="text-xs px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--fg-secondary)',
        }}
      >
        Ctrl+K
      </span>
    </div>
  );
};

export default SearchBar;
