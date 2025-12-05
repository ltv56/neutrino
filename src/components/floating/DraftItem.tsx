import React from 'react';
import { X } from 'lucide-react';

interface DraftItemProps {
  title: string;
  datetime?: string;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export const DraftItem: React.FC<DraftItemProps> = ({
  title,
  datetime,
  isActive,
  onClick,
  onRemove,
}) => {
  return (
    <div
      style={{
        width: '100%',
        borderBottom: '1px solid var(--border)',
        position: 'relative'
      }}
    >
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2 hover:bg-(--bg-tertiary) transition-colors"
        style={{
          backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
          display: 'block',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: '20px',
            marginBottom: datetime ? '2px' : '0',
          }}
        >
          {title}
        </div>
        {datetime && (
          <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.2' }}>
            {datetime}
          </div>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:bg-(--bg-primary) rounded transition-colors"
        style={{
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <X size={11} />
      </button>
    </div>
  );
};
